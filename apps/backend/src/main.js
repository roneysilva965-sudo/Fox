import http from 'node:http';
import { json, readJsonBody } from './core/http.js';
import { Router } from './core/router.js';
import { store } from './data/store.js';
import { OrderService } from './modules/orders/order-service.js';
import { MerchantService } from './modules/merchant/merchant-service.js';
import { RealtimeService } from './modules/realtime/realtime-service.js';
import { CustomerService } from './modules/customer/customer-service.js';
import { AuthService } from './modules/auth/auth-service.js';
import { CatalogService } from './modules/catalog/catalog-service.js';
import { CourierService } from './modules/courier/courier-service.js';
import { PricingService } from './modules/pricing/pricing-service.js';
import { DiscoveryService } from './modules/discovery/discovery-service.js';

const router = new Router();
const orderService = new OrderService(store);
const merchantService = new MerchantService(store);
const realtimeService = new RealtimeService(store);
const customerService = new CustomerService(store);
const authService = new AuthService(store);
const catalogService = new CatalogService(store);
const courierService = new CourierService(store);
const pricingService = new PricingService(store);
const discoveryService = new DiscoveryService(store);

function getBearerToken(request) {
  const header = request.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

function requireRole(request, response, expectedRole) {
  const token = getBearerToken(request);
  const session = token ? authService.authenticate(token) : null;
  if (!session || session.user.role !== expectedRole) {
    json(response, 401, { message: 'Unauthorized' });
    return null;
  }

  return session;
}

router.register('POST', '/auth/login', async (request, response) => {
  const body = await readJsonBody(request);
  const result = authService.login(body.phone, body.role);
  if (!result) {
    json(response, 401, { message: 'Invalid credentials' });
    return;
  }

  json(response, 200, { data: result });
});

router.register('GET', '/auth/me', async (request, response) => {
  const token = getBearerToken(request);
  const session = token ? authService.authenticate(token) : null;
  if (!session) {
    json(response, 401, { message: 'Unauthorized' });
    return;
  }

  json(response, 200, { data: session.user });
});

router.register('GET', '/health', async (_request, response) => {
  json(response, 200, {
    status: 'ok',
    service: 'fox-backend',
    time: new Date().toISOString(),
    persistence: process.env.NODE_ENV === 'test' ? 'disabled' : 'file',
  });
});

router.register('GET', '/customer/discovery/feed', async (request, response) => {
  const filters = request.query.filters ? request.query.filters.split(',') : [];
  json(response, 200, { data: discoveryService.getFeed(filters) });
});

router.register('POST', '/customer/cart/price', async (request, response) => {
  const body = await readJsonBody(request);
  const pricing = pricingService.priceCart(body);
  json(response, 200, { data: pricing });
});

router.register('GET', '/merchant/orders', async (request, response) => {
  const session = requireRole(request, response, 'merchant_owner');
  if (!session) return;

  const merchantId = session.user.merchantId;
  json(response, 200, {
    data: orderService.listMerchantOrders(merchantId, request.query.status),
  });
});

router.register('POST', '/merchant/orders/:orderId/accept', async (request, response) => {
  const session = requireRole(request, response, 'merchant_owner');
  if (!session) return;

  try {
    const body = await readJsonBody(request);
    const order = orderService.acceptOrder(request.params.orderId, Number(body.prepTimeMin ?? 20));
    if (!order) {
      json(response, 404, { message: 'Order not found' });
      return;
    }

    json(response, 200, { data: order });
  } catch (error) {
    json(response, 422, { message: error.message });
  }
});

router.register('POST', '/merchant/orders/:orderId/reject', async (request, response) => {
  const session = requireRole(request, response, 'merchant_owner');
  if (!session) return;

  try {
    const body = await readJsonBody(request);
    const order = orderService.rejectOrder(request.params.orderId, body.reason ?? 'Sem motivo informado');
    if (!order) {
      json(response, 404, { message: 'Order not found' });
      return;
    }

    json(response, 200, { data: order });
  } catch (error) {
    json(response, 422, { message: error.message });
  }
});

router.register('PATCH', '/merchant/orders/:orderId/status', async (request, response) => {
  const session = requireRole(request, response, 'merchant_owner');
  if (!session) return;

  try {
    const body = await readJsonBody(request);
    const result = orderService.updateStatus(request.params.orderId, body.status);
    if (!result) {
      json(response, 404, { message: 'Order not found' });
      return;
    }

    json(response, 200, { data: result.order, meta: { offersCreated: result.offers.length } });
  } catch (error) {
    json(response, 422, { message: error.message });
  }
});

router.register('GET', '/merchant/dashboard', async (request, response) => {
  const session = requireRole(request, response, 'merchant_owner');
  if (!session) return;

  json(response, 200, { data: merchantService.getDashboard(session.user.merchantId) });
});

router.register('GET', '/merchant/finance/statement', async (request, response) => {
  const session = requireRole(request, response, 'merchant_owner');
  if (!session) return;

  json(response, 200, { data: merchantService.getFinanceStatement(session.user.merchantId) });
});

router.register('GET', '/merchant/catalog/products', async (request, response) => {
  const session = requireRole(request, response, 'merchant_owner');
  if (!session) return;

  json(response, 200, { data: catalogService.listProducts(session.user.merchantId) });
});

router.register('POST', '/merchant/catalog/products', async (request, response) => {
  const session = requireRole(request, response, 'merchant_owner');
  if (!session) return;

  const body = await readJsonBody(request);
  const product = catalogService.createProduct({ ...body, merchantId: session.user.merchantId });
  json(response, 201, { data: product });
});

router.register('GET', '/merchant/orders/stream', async (request, response) => {
  const session = requireRole(request, response, 'merchant_owner');
  if (!session) return;

  const detach = realtimeService.attachStream(response, 'merchant', session.user.merchantId);
  request.on('close', detach);
});

router.register('POST', '/customer/orders', async (request, response) => {
  const body = await readJsonBody(request);
  const merchantId = body.merchantId ?? 'merchant-burger-house';
  const pricing = pricingService.priceCart({
    merchantId,
    items: body.items,
    deliveryFee: body.deliveryFee,
    couponCode: body.couponCode,
  });

  const order = orderService.createCustomerOrder({
    merchantId,
    customerName: body.customerName ?? 'Cliente Fox',
    customerPhone: body.customerPhone ?? '5511999999999',
    pricing,
  });

  json(response, 201, { data: order });
});

router.register('GET', '/customer/orders/:orderId/tracking', async (request, response) => {
  const tracking = customerService.getTracking(request.params.orderId);
  if (!tracking) {
    json(response, 404, { message: 'Order not found' });
    return;
  }

  json(response, 200, { data: tracking });
});

router.register('GET', '/courier/offers/active', async (request, response) => {
  const session = requireRole(request, response, 'courier');
  if (!session) return;

  json(response, 200, { data: courierService.listActiveOffers(session.user.courierId) });
});

router.register('POST', '/courier/offers/:offerId/accept', async (request, response) => {
  const session = requireRole(request, response, 'courier');
  if (!session) return;

  const result = courierService.acceptOffer(request.params.offerId);
  if (!result) {
    json(response, 404, { message: 'Offer not found' });
    return;
  }

  json(response, 200, { data: result });
});

router.register('PATCH', '/courier/tasks/:taskId/status', async (request, response) => {
  const session = requireRole(request, response, 'courier');
  if (!session) return;

  const body = await readJsonBody(request);
  const result = courierService.updateTask(request.params.taskId, body.status);
  if (!result) {
    json(response, 404, { message: 'Task not found' });
    return;
  }

  json(response, 200, { data: result });
});

router.register('GET', '/courier/wallet', async (request, response) => {
  const session = requireRole(request, response, 'courier');
  if (!session) return;

  const wallet = courierService.getWallet(session.user.courierId);
  if (!wallet) {
    json(response, 404, { message: 'Courier not found' });
    return;
  }

  json(response, 200, { data: wallet });
});

router.register('GET', '/courier/offers/stream', async (request, response) => {
  const session = requireRole(request, response, 'courier');
  if (!session) return;

  const detach = realtimeService.attachStream(response, 'courier', session.user.courierId);
  request.on('close', detach);
});

export function buildServer() {
  return http.createServer((request, response) => router.handle(request, response));
}

const isEntrypoint = process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url;

if (isEntrypoint) {
  const port = Number(process.env.PORT ?? 3000);
  buildServer().listen(port, () => {
    console.log(`fox-backend listening on port ${port}`);
  });
}
