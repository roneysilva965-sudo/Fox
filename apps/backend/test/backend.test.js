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

test('merchant web panel and settings/discovery flows work together', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const merchantPanelResponse = await fetch(`${baseUrl}/app/merchant`);
    const merchantPanelHtml = await merchantPanelResponse.text();
    assert.equal(merchantPanelResponse.status, 200);
    assert.match(merchantPanelHtml, /Fox Merchant/);

    const courierPanelResponse = await fetch(`${baseUrl}/app/courier`);
    const courierPanelHtml = await courierPanelResponse.text();
    assert.equal(courierPanelResponse.status, 200);
    assert.match(courierPanelHtml, /Fox Courier/);

    const customerPanelResponse = await fetch(`${baseUrl}/app/customer`);
    const customerPanelHtml = await customerPanelResponse.text();
    assert.equal(customerPanelResponse.status, 200);
    assert.match(customerPanelHtml, /Fox Customer/);

    const merchantToken = await login(baseUrl, '5511911111111', 'merchant_owner');

    const settingsResponse = await fetch(`${baseUrl}/merchant/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({ status: 'paused', averagePrepTimeMin: 30, tags: ['pausada temporariamente'] }),
    });
    assert.equal(settingsResponse.status, 200);

    const getSettingsResponse = await fetch(`${baseUrl}/merchant/settings`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const settings = await getSettingsResponse.json();
    assert.equal(settings.data.status, 'paused');

    await fetch(`${baseUrl}/merchant/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({ status: 'active', averagePrepTimeMin: 18, tags: ['entrega rápida', 'smash'] }),
    });

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

    const discoveryResponse = await fetch(`${baseUrl}/customer/discovery/feed?filters=fast_delivery`);
    const discovery = await discoveryResponse.json();
    assert.equal(discovery.data[0].merchantId, 'merchant-burger-house');
  } finally {
    server.close();
  }
});

test('delivery completion credits customer cashback, supports courier withdrawal and updates admin overview', async () => {
  const { server, baseUrl } = await startServer();

  try {
    const merchantPanelResponse = await fetch(`${baseUrl}/app/merchant`);
    const merchantPanelHtml = await merchantPanelResponse.text();
    assert.equal(merchantPanelResponse.status, 200);
    assert.match(merchantPanelHtml, /Fox Merchant/);

    const courierPanelResponse = await fetch(`${baseUrl}/app/courier`);
    const courierPanelHtml = await courierPanelResponse.text();
    assert.equal(courierPanelResponse.status, 200);
    assert.match(courierPanelHtml, /Fox Courier/);

    const customerPanelResponse = await fetch(`${baseUrl}/app/customer`);
    const customerPanelHtml = await customerPanelResponse.text();
    assert.equal(customerPanelResponse.status, 200);
    assert.match(customerPanelHtml, /Fox Customer/);

    const merchantToken = await login(baseUrl, '5511911111111', 'merchant_owner');
    const courierToken = await login(baseUrl, '5511922222222', 'courier');
    const adminToken = await login(baseUrl, '5511944444444', 'admin');

    const createOrderResponse = await fetch(`${baseUrl}/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: 'merchant-burger-house',
        customerName: 'Bob',
        customerPhone: '5511933333333',
        couponCode: 'FRETEGRATIS',
        items: [{ productId: 'product-fries-large', quantity: 1 }],
      }),
    });
    const created = await createOrderResponse.json();

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

    await fetch(`${baseUrl}/merchant/orders/${created.data.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`,
      },
      body: JSON.stringify({ status: 'ready_for_pickup' }),
    });

    const offersResponse = await fetch(`${baseUrl}/courier/offers/active`, {
      headers: { Authorization: `Bearer ${courierToken}` },
    });
    const offers = await offersResponse.json();

    const acceptOfferResponse = await fetch(`${baseUrl}/courier/offers/${offers.data[0].id}/accept`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${courierToken}` },
    });
    const offerResult = await acceptOfferResponse.json();

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

    const customerWalletResponse = await fetch(`${baseUrl}/customer/wallet?phone=5511933333333`);
    const customerWallet = await customerWalletResponse.json();
    assert.equal(customerWallet.data.availableBalance, 15.43);

    const courierWalletBefore = await fetch(`${baseUrl}/courier/wallet`, {
      headers: { Authorization: `Bearer ${courierToken}` },
    });
    const walletBefore = await courierWalletBefore.json();
    assert.equal(walletBefore.data.availableBalance, 6);

    const withdrawalResponse = await fetch(`${baseUrl}/courier/wallet/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${courierToken}`,
      },
      body: JSON.stringify({ amount: 4 }),
    });
    assert.equal(withdrawalResponse.status, 201);

    const courierWalletAfter = await fetch(`${baseUrl}/courier/wallet`, {
      headers: { Authorization: `Bearer ${courierToken}` },
    });
    const walletAfter = await courierWalletAfter.json();
    assert.equal(walletAfter.data.availableBalance, 2);

    const statementResponse = await fetch(`${baseUrl}/merchant/finance/statement`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    const statement = await statementResponse.json();
    assert.equal(statement.data.balance, 12.76);

    const overviewResponse = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const overview = await overviewResponse.json();
    assert.equal(overview.data.totalOrders, 1);
    assert.equal(overview.data.deliveredOrders, 1);
    assert.equal(overview.data.activeCouriers, 1);
  } finally {
    server.close();
  }
});
