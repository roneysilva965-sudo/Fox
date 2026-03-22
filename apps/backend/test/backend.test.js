import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { buildServer } from '../src/main.js';
import { store } from '../src/data/store.js';

async function startServer() {
  store.reset();
  const server = buildServer();
  server.listen(0);
  await once(server, 'listening');
  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function login(baseUrl, phone, role) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, role }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  return payload.data.token;
}

test('customer pricing and merchant catalog/dashboard work together', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const merchantToken = await login(baseUrl, '5511911111111', 'merchant_owner');

    const pricingResponse = await fetch(`${baseUrl}/customer/cart/price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'merchant-burger-house',
        items: [{ productId: 'product-smash-classic', quantity: 2 }],
        couponCode: 'FOX10',
      }),
    });
    assert.equal(pricingResponse.status, 200);
    const pricing = await pricingResponse.json();
    assert.equal(pricing.data.discountAmount, 5.78);

    const createProductResponse = await fetch(`${baseUrl}/merchant/catalog/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({
        name: 'Combo Fox',
        description: 'Burger + fries + soda',
        basePrice: 41.9,
        stockQuantity: 50,
      }),
    });
    assert.equal(createProductResponse.status, 201);

    const createOrderResponse = await fetch(`${baseUrl}/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'merchant-burger-house',
        customerName: 'Alice',
        couponCode: 'FOX10',
        items: [{ productId: 'product-smash-classic', quantity: 2 }],
      }),
    });
    assert.equal(createOrderResponse.status, 201);
    const created = await createOrderResponse.json();
    assert.equal(created.data.discountAmount, 5.78);

    const discoveryResponse = await fetch(`${baseUrl}/customer/discovery/feed?filters=free_delivery,fast_delivery`);
    const discovery = await discoveryResponse.json();
    assert.equal(discovery.data[0].merchantId, 'merchant-burger-house');

    const listResponse = await fetch(`${baseUrl}/merchant/orders`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const listed = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(listed.data.length, 1);

    const dashboardResponse = await fetch(`${baseUrl}/merchant/dashboard`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const dashboard = await dashboardResponse.json();
    assert.equal(dashboard.data.totalOrders, 1);
    assert.equal(dashboard.data.activeOrders, 1);

    const catalogResponse = await fetch(`${baseUrl}/merchant/catalog/products`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const catalog = await catalogResponse.json();
    assert.equal(catalog.data.length, 3);
  } finally {
    server.close();
  }
});

test('courier completion updates customer tracking and merchant finance statement', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const merchantToken = await login(baseUrl, '5511911111111', 'merchant_owner');
    const courierToken = await login(baseUrl, '5511922222222', 'courier');

    const createOrderResponse = await fetch(`${baseUrl}/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'merchant-burger-house',
        customerName: 'Bob',
        couponCode: 'FRETEGRATIS',
        items: [{ productId: 'product-fries-large', quantity: 1 }],
      }),
    });
    const created = await createOrderResponse.json();
    assert.equal(created.data.deliveryFee, 0);

    await fetch(`${baseUrl}/merchant/orders/${created.data.id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({ prepTimeMin: 12 }),
    });

    await fetch(`${baseUrl}/merchant/orders/${created.data.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({ status: 'preparing' }),
    });

    const pickupResponse = await fetch(`${baseUrl}/merchant/orders/${created.data.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({ status: 'ready_for_pickup' }),
    });
    const pickupPayload = await pickupResponse.json();
    assert.equal(pickupPayload.meta.offersCreated, 1);

    const offersResponse = await fetch(`${baseUrl}/courier/offers/active`, {
      headers: { Authorization: `Bearer ${courierToken}` },
    });
    const offers = await offersResponse.json();
    assert.equal(offers.data.length, 1);

    const acceptOfferResponse = await fetch(`${baseUrl}/courier/offers/${offers.data[0].id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${courierToken}` },
    });
    const offerResult = await acceptOfferResponse.json();
    assert.equal(acceptOfferResponse.status, 200);

    await fetch(`${baseUrl}/courier/tasks/${offerResult.data.task.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${courierToken}`,
      },
      body: JSON.stringify({ status: 'picked_up' }),
    });

    await fetch(`${baseUrl}/courier/tasks/${offerResult.data.task.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${courierToken}`,
      },
      body: JSON.stringify({ status: 'completed' }),
    });

    const walletResponse = await fetch(`${baseUrl}/courier/wallet`, {
      headers: { Authorization: `Bearer ${courierToken}` },
    });
    const wallet = await walletResponse.json();
    assert.equal(wallet.data.totalEarned, 6);

    const statementResponse = await fetch(`${baseUrl}/merchant/finance/statement`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const statement = await statementResponse.json();
    assert.equal(statement.data.entries.length, 1);
    assert.equal(statement.data.balance, 12.76);

    const trackingResponse = await fetch(`${baseUrl}/customer/orders/${created.data.id}/tracking`);
    const tracking = await trackingResponse.json();
    assert.equal(tracking.data.status, 'delivered');
    assert.equal(tracking.data.couponCode, 'FRETEGRATIS');
  } finally {
    server.close();
  }
});
