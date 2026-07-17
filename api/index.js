/**
 * Textures Galleria — Vercel Serverless Function
 * Handles all API routes and static file serving for Vercel deployment.
 * Uses /tmp for writable data storage (Vercel serverless limitation).
 */

const fs = require('fs');
const path = require('path');

function generateId() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 11);
}

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const TMP_DIR = '/tmp/textures-galleria-data';
const ORDERS_FILE = path.join(TMP_DIR, 'orders.json');
const PORTFOLIO_FILE = path.join(TMP_DIR, 'portfolio.json');
const SEED_PORTFOLIO = path.join(__dirname, '..', 'data', 'portfolio.json');
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-this-passcode';
const BUSINESS_SMS_TO = process.env.BUSINESS_SMS_TO || '03376184616';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

// Ensure /tmp directory exists and seed data from read-only source
function ensureTmpDir() {
  try {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
      console.log('[TMP] Created directory:', TMP_DIR);
      // Seed portfolio from read-only data directory
      if (fs.existsSync(SEED_PORTFOLIO)) {
        const seedData = JSON.parse(fs.readFileSync(SEED_PORTFOLIO, 'utf8'));
        fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(seedData, null, 2));
        console.log('[TMP] Seeded portfolio data from', SEED_PORTFOLIO);
      }
    }
  } catch (e) {
    console.error('[TMP] Failed to create temp directory:', e.message);
    throw e;
  }
}

// ---------- helpers ----------

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

function writeJSON(file, data) {
  try {
    ensureTmpDir();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[WRITE] Failed to write file:', e.message);
    throw e;
  }
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(body));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  };
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function isAdmin(req, query) {
  const headerKey = req.headers['x-admin-key'];
  return headerKey === ADMIN_KEY || query.key === ADMIN_KEY;
}

function normalizePhoneNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('92')) return `+${digits}`;
  if (digits.startsWith('0')) return `+92${digits.slice(1)}`;
  return `+${digits}`;
}

function buildOrderNotificationMessage(order) {
  const service = order.serviceType || 'custom service';
  const customerPhone = order.phone || 'Not provided';
  const details = order.details || 'No details provided';
  const space = order.space || 'Not specified';
  const material = order.preferredMaterial || 'Not specified';
  const budget = order.budget || 'Not specified';
  return `🛒 *New Order Received!*\n\n👤 *Name:* ${order.name || 'Unknown'}\n📞 *Phone:* ${customerPhone}\n📧 *Email:* ${order.email || 'Not provided'}\n🔧 *Service:* ${service}\n🏠 *Space:* ${space}\n🧵 *Material:* ${material}\n💰 *Budget:* ${budget}\n📝 *Details:* ${details}`;
}

function buildWhatsAppUrl(order) {
  const phone = normalizePhoneNumber(BUSINESS_SMS_TO).replace(/\D/g, '');
  const message = encodeURIComponent(buildOrderNotificationMessage(order));
  return `https://wa.me/${phone}?text=${message}`;
}

function sendOrderNotification(order) {
  const toNumber = normalizePhoneNumber(BUSINESS_SMS_TO);
  const fromNumber = normalizePhoneNumber(TWILIO_FROM_NUMBER);

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    const whatsappUrl = buildWhatsAppUrl(order);
    console.log(`[SMS] Twilio not configured. WhatsApp URL: ${whatsappUrl}`);
    return Promise.resolve({ ok: true, skipped: true, whatsappUrl });
  }

  const https = require('https');
  const body = new URLSearchParams({
    To: toNumber,
    From: fromNumber,
    Body: buildOrderNotificationMessage(order),
  });

  const options = {
    hostname: 'api.twilio.com',
    port: 443,
    path: `/2010-04-01/Accounts/${encodeURIComponent(TWILIO_ACCOUNT_SID)}/Messages.json`,
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body.toString()),
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let payload = '';
      res.on('data', (chunk) => { payload += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[SMS] Notification sent successfully.');
          resolve({ ok: true });
        } else {
          console.error(`[SMS] Failed. Status: ${res.statusCode}. ${payload}`);
          resolve({ ok: false, error: payload, whatsappUrl: buildWhatsAppUrl(order) });
        }
      });
    });
    req.on('error', (err) => {
      console.error('[SMS] Error:', err.message);
      resolve({ ok: false, error: err.message, whatsappUrl: buildWhatsAppUrl(order) });
    });
    req.write(body.toString());
    req.end();
  });
}

function validateOrder(o) {
  const errors = [];
  if (!o.name || !o.name.trim()) errors.push('Name is required.');
  if (!o.phone || !o.phone.trim()) errors.push('Phone number is required.');
  if (!o.serviceType) errors.push('Please select a service type.');
  if (!o.details || !o.details.trim()) errors.push('Please add a few details about the order.');
  return errors;
}

// ---------- request handler ----------

module.exports = async (req, res) => {
  // Ensure /tmp is ready and data is seeded
  ensureTmpDir();

  // Parse URL safely - req.url is always the path+query on Vercel
  const rawUrl = req.url || '/';
  const qIndex = rawUrl.indexOf('?');
  const pathname = decodeURIComponent(qIndex >= 0 ? rawUrl.substring(0, qIndex) : rawUrl);
  const query = {};
  if (qIndex >= 0) {
    const searchParams = new URLSearchParams(rawUrl.substring(qIndex + 1));
    for (const [k, v] of searchParams) {
      query[k] = v;
    }
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/health' && req.method === 'GET') {
    return send(res, 200, { ok: true, service: 'textures-galleria' });
  }

  // ---- API: portfolio (public) ----
  if (pathname === '/api/portfolio' && req.method === 'GET') {
    const portfolio = readJSON(PORTFOLIO_FILE, []);
    return send(res, 200, portfolio);
  }

  // ---- API: submit a new order (public) ----
  if (pathname === '/api/orders' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const errors = validateOrder(body);
      if (errors.length) return send(res, 400, { ok: false, errors });

      const orders = readJSON(ORDERS_FILE, []);
      const order = {
        id: generateId(),
        name: body.name.trim(),
        phone: body.phone.trim(),
        email: (body.email || '').trim(),
        serviceType: body.serviceType,
        space: (body.space || '').trim(),
        preferredMaterial: body.preferredMaterial || '',
        budget: body.budget || '',
        details: body.details.trim(),
        status: 'New',
        createdAt: new Date().toISOString(),
      };
      orders.unshift(order);
      writeJSON(ORDERS_FILE, orders);
      
      // Send notification - always returns whatsappUrl even if Twilio fails
      const notification = await sendOrderNotification(order);
      
      return send(res, 201, {
        ok: true,
        message: 'Order received! We will contact you shortly.',
        id: order.id,
        whatsappUrl: notification.whatsappUrl || buildWhatsAppUrl(order),
      });
    } catch (e) {
      console.error('[ORDER] Error:', e.message, e.stack);
      return send(res, 400, { ok: false, errors: ['Could not process the order. Please try again.', e.message] });
    }
  }

  // ---- API: list orders (admin only) ----
  if (pathname === '/api/orders' && req.method === 'GET') {
    if (!isAdmin(req, query)) return send(res, 401, { ok: false, error: 'Unauthorized' });
    const orders = readJSON(ORDERS_FILE, []);
    return send(res, 200, orders);
  }

  // ---- API: update order status (admin only) ----
  const statusMatch = pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (statusMatch && req.method === 'POST') {
    if (!isAdmin(req, query)) return send(res, 401, { ok: false, error: 'Unauthorized' });
    try {
      const body = await parseBody(req);
      const allowed = ['New', 'Approved', 'In Progress', 'Completed', 'Cancelled'];
      if (!allowed.includes(body.status)) return send(res, 400, { ok: false, error: 'Invalid status' });

      const orders = readJSON(ORDERS_FILE, []);
      const idx = orders.findIndex((o) => o.id === statusMatch[1]);
      if (idx === -1) return send(res, 404, { ok: false, error: 'Order not found' });

      orders[idx].status = body.status;
      writeJSON(ORDERS_FILE, orders);
      return send(res, 200, { ok: true, order: orders[idx] });
    } catch (e) {
      return send(res, 400, { ok: false, error: 'Bad request' });
    }
  }

  // ---- API: add to portfolio (admin only) ----
  if (pathname === '/api/portfolio' && req.method === 'POST') {
    if (!isAdmin(req, query)) return send(res, 401, { ok: false, error: 'Unauthorized' });
    try {
      const body = await parseBody(req);
      if (!body.title || !body.description || !body.material) {
        return send(res, 400, { ok: false, error: 'title, description and material are required.' });
      }
      const portfolio = readJSON(PORTFOLIO_FILE, []);
      const item = {
        id: generateId(),
        title: body.title,
        description: body.description,
        material: body.material,
        location: body.location || '',
        addedAt: new Date().toISOString(),
      };
      portfolio.unshift(item);
      writeJSON(PORTFOLIO_FILE, portfolio);
      return send(res, 201, { ok: true, item });
    } catch (e) {
      return send(res, 400, { ok: false, error: 'Bad request' });
    }
  }

  // ---- static files ----
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);

  // prevent path traversal outside /public
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      return sendFile(res, filePath);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
};