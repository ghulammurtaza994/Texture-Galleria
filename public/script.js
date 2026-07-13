// ---------- portfolio ----------

async function loadPortfolio() {
  const grid = document.getElementById('portfolio-grid');
  try {
    const res = await fetch('/api/portfolio');
    const items = await res.json();

    if (!items.length) {
      grid.innerHTML = '<p class="empty-state">No completed orders published yet — check back soon.</p>';
      return;
    }

    grid.innerHTML = items.map(renderCard).join('');
  } catch (e) {
    grid.innerHTML = '<p class="empty-state">Could not load completed work right now.</p>';
  }
}

function renderCard(item) {
  const textureClass = ['wood', 'velvet', 'jute', 'emerald', 'mixed'].includes(item.material)
    ? `tx-${item.material}`
    : 'tx-wood';
  const materialLabel = item.material.charAt(0).toUpperCase() + item.material.slice(1);
  const mediaClass = item.image ? 'card-media card-media-image' : `card-media ${textureClass}`;
  const mediaStyle = item.image ? `style="background-image:url('${escapeHtml(item.image)}')"` : '';

  return `
    <div class="card">
      <div class="${mediaClass}" ${mediaStyle}>
        <span class="card-tag">${escapeHtml(materialLabel)}</span>
      </div>
      <div class="card-body">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
        ${item.location ? `<div class="loc">${escapeHtml(item.location)}</div>` : ''}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- order form ----------

function initOrderForm() {
  const form = document.getElementById('order-form');
  const msg = document.getElementById('form-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'form-msg';

    const payload = {
      name: form.name.value,
      phone: form.phone.value,
      email: form.email.value,
      serviceType: form.serviceType.value,
      space: form.space.value,
      preferredMaterial: form.preferredMaterial.value,
      budget: form.budget.value,
      details: form.details.value,
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        msg.textContent = data.message || 'Order received. We will contact you shortly.';
        msg.className = 'form-msg show ok';
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
        form.reset();
      } else {
        msg.textContent = (data.errors && data.errors.join(' ')) || 'Something went wrong. Please try again.';
        msg.className = 'form-msg show err';
      }
    } catch (err) {
      msg.textContent = 'Could not reach the server. Please try again or call us directly.';
      msg.className = 'form-msg show err';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Order Request';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadPortfolio();
  initOrderForm();
});
