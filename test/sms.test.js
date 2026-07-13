const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizePhoneNumber, buildOrderNotificationMessage, buildWhatsAppUrl } = require('../server');

test('normalizePhoneNumber converts Pakistani numbers to E.164', () => {
  assert.equal(normalizePhoneNumber('03376184616'), '+923376184616');
  assert.equal(normalizePhoneNumber('+923376184616'), '+923376184616');
});

test('buildOrderNotificationMessage includes key order details', () => {
  const order = {
    name: 'Ali',
    phone: '03376184616',
    serviceType: 'Curtains',
    details: 'Need velvet curtains in lounge',
  };

  const message = buildOrderNotificationMessage(order);
  assert.match(message, /New order received/i);
  assert.match(message, /Ali/);
  assert.match(message, /Curtains/);
  assert.match(message, /03376184616/);
});

test('buildWhatsAppUrl creates a chat link for the business number', () => {
  const order = {
    name: 'Ali',
    phone: '03376184616',
    serviceType: 'Curtains',
    details: 'Need velvet curtains in lounge',
  };

  const url = buildWhatsAppUrl(order);
  assert.match(url, /wa\.me\/923376184616/i);
  assert.match(url, /Need%20velvet%20curtains/i);
});
