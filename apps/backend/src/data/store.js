import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const PERSIST_ENABLED = process.env.NODE_ENV !== 'test';
const now = () => new Date().toISOString();

function buildOrderTimeline(status, detail) {
  return [{ status, detail, createdAt: now() }];
}

function defaultData() {
  return {
    merchants: [
      {
        id: 'merchant-burger-house',
        tradeName: 'Burger House',
        legalName: 'Burger House LTDA',
        ownerUserId: 'user-merchant-owner',
        status: 'active',
        averagePrepTimeMin: 20,
        commissionRate: 12,
        walletBalance: 0,
        categories: ['Burgers', 'Porções'],
        deliveryTimeMin: 35,
        distanceKm: 3.2,
        tags: ['entrega rápida', 'smash', 'frete grátis acima de 50'],
      },
    ],
    products: [
      {
        id: 'product-smash-classic',
        merchantId: 'merchant-burger-house',
        categoryId: 'category-burgers',
        name: 'Smash Classic',
        description: 'Pão, blend bovino e queijo',
        basePrice: 28.9,
        active: true,
        stockQuantity: 100,
      },
      {
        id: 'product-fries-large',
        merchantId: 'merchant-burger-house',
        categoryId: 'category-sides',
        name: 'Large Fries',
        description: 'Batata crocante tamanho grande',
        basePrice: 14.5,
        active: true,
        stockQuantity: 100,
      },
    ],
    users: [
      { id: 'user-merchant-owner', fullName: 'Merchant Owner', phone: '5511911111111', role: 'merchant_owner', merchantId: 'merchant-burger-house' },
      { id: 'user-courier-1', fullName: 'Courier One', phone: '5511922222222', role: 'courier', courierId: 'courier-1' },
      { id: 'user-customer-1', fullName: 'Customer One', phone: '5511933333333', role: 'customer', walletBalance: 15 },
    ],
    couriers: [
      {
        id: 'courier-1',
        userId: 'user-courier-1',
        fullName: 'Courier One',
        vehicle: 'motorcycle',
        isOnline: true,
        score: 98,
        wallet: { availableBalance: 0, totalEarned: 0, withdrawals: [] },
      },
    ],
    sessions: [],
    orders: [],
    deliveryTasks: [],
    offers: [],
    events: [],
    coupons: [
      { id: 'coupon-fox10', code: 'FOX10', type: 'percentage', value: 10, maxDiscount: 12, active: true },
      { id: 'coupon-frete', code: 'FRETEGRATIS', type: 'free_delivery', value: 0, maxDiscount: null, active: true },
    ],
    ledgerEntries: [],
  };
}

export class InMemoryStore {
  constructor() {
    this.sseClients = new Set();
    this.reset();
  }

  reset() {
    const restored = this.loadPersistedData();
    const data = restored ?? defaultData();

    this.merchants = data.merchants;
    this.products = data.products;
    this.users = data.users;
    this.couriers = data.couriers;
    this.sessions = data.sessions;
    this.orders = data.orders;
    this.deliveryTasks = data.deliveryTasks;
    this.offers = data.offers;
    this.events = data.events;
    this.coupons = data.coupons ?? [];
    this.ledgerEntries = data.ledgerEntries ?? [];
    this.sseClients = new Set();
  }

  loadPersistedData() {
    if (!PERSIST_ENABLED || !fs.existsSync(DATA_FILE)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }

  persist() {
    if (!PERSIST_ENABLED) {
      return;
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({
        merchants: this.merchants,
        products: this.products,
        users: this.users,
        couriers: this.couriers,
        sessions: this.sessions,
        orders: this.orders,
        deliveryTasks: this.deliveryTasks,
        offers: this.offers,
        events: this.events,
        coupons: this.coupons,
        ledgerEntries: this.ledgerEntries,
      }, null, 2),
    );
  }

  listOrdersByMerchant(merchantId, status) {
    return this.orders.filter((order) => order.merchantId === merchantId && (!status || order.status === status));
  }

  getOrder(orderId) {
    return this.orders.find((order) => order.id === orderId) ?? null;
  }

  getMerchant(merchantId) {
    return this.merchants.find((merchant) => merchant.id === merchantId) ?? null;
  }

  listMerchants() {
    return this.merchants.filter((merchant) => merchant.status === 'active');
  }

  listProductsByMerchant(merchantId) {
    return this.products.filter((product) => product.merchantId === merchantId);
  }

  findProduct(productId) {
    return this.products.find((product) => product.id === productId) ?? null;
  }

  createProduct(payload) {
    const product = {
      id: randomUUID(),
      merchantId: payload.merchantId,
      categoryId: payload.categoryId ?? 'category-general',
      name: payload.name,
      description: payload.description ?? '',
      basePrice: Number(payload.basePrice),
      active: payload.active ?? true,
      stockQuantity: Number(payload.stockQuantity ?? 0),
      createdAt: now(),
    };
    this.products.unshift(product);
    this.persist();
    return product;
  }

  findUserByPhoneRole(phone, role) {
    return this.users.find((user) => user.phone === phone && (!role || user.role === role)) ?? null;
  }

  getUser(userId) {
    return this.users.find((user) => user.id === userId) ?? null;
  }

  createSession(user) {
    const session = {
      id: randomUUID(),
      token: randomUUID(),
      userId: user.id,
      role: user.role,
      createdAt: now(),
    };
    this.sessions.unshift(session);
    this.persist();
    return session;
  }

  findSession(token) {
    return this.sessions.find((session) => session.token === token) ?? null;
  }

  findCoupon(code) {
    return this.coupons.find((coupon) => coupon.code === code && coupon.active) ?? null;
  }

  createOrder(payload) {
    const createdAt = now();
    const order = {
      id: randomUUID(),
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      merchantId: payload.merchantId,
      status: 'placed',
      prepTimeMin: null,
      rejectionReason: null,
      courierId: null,
      couponCode: payload.pricing.couponCode ?? null,
      items: payload.pricing.items,
      subtotal: payload.pricing.subtotal,
      deliveryFee: payload.pricing.deliveryFee,
      serviceFee: payload.pricing.serviceFee,
      discountAmount: payload.pricing.discountAmount,
      cashbackEarned: payload.pricing.cashbackEarned,
      total: payload.pricing.total,
      createdAt,
      updatedAt: createdAt,
      timeline: buildOrderTimeline('placed', 'Pedido criado pelo cliente'),
    };

    this.orders.unshift(order);
    this.persist();
    this.publishEvent('order.created', { orderId: order.id, merchantId: order.merchantId, status: order.status });
    return order;
  }

  updateOrder(orderId, mutate) {
    const order = this.getOrder(orderId);
    if (!order) {
      return null;
    }

    mutate(order);
    order.updatedAt = now();
    this.persist();
    return order;
  }

  appendTimeline(order, status, detail) {
    order.timeline.push({ status, detail, createdAt: now() });
  }

  createDeliveryOffers(order) {
    const eligibleCouriers = this.couriers.filter((courier) => courier.isOnline);
    const offers = eligibleCouriers.map((courier) => ({
      id: randomUUID(),
      orderId: order.id,
      merchantId: order.merchantId,
      courierId: courier.id,
      status: 'sent',
      fee: Number((6 + order.deliveryFee).toFixed(2)),
      createdAt: now(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    }));
    this.offers.unshift(...offers);
    this.persist();
    for (const offer of offers) {
      this.publishEvent('dispatch.offer_created', offer);
    }
    return offers;
  }

  listActiveOffers(courierId) {
    return this.offers.filter((offer) => offer.courierId === courierId && ['sent', 'viewed'].includes(offer.status));
  }

  getOffer(offerId) {
    return this.offers.find((offer) => offer.id === offerId) ?? null;
  }

  acceptOffer(offerId) {
    const offer = this.getOffer(offerId);
    if (!offer) {
      return null;
    }

    offer.status = 'accepted';
    const order = this.getOrder(offer.orderId);
    if (order) {
      order.status = 'courier_assigned';
      order.courierId = offer.courierId;
      this.appendTimeline(order, 'courier_assigned', `Entregador ${offer.courierId} aceitou a corrida`);
    }

    let task = this.deliveryTasks.find((candidate) => candidate.orderId === offer.orderId);
    if (!task) {
      task = {
        id: randomUUID(),
        orderId: offer.orderId,
        courierId: offer.courierId,
        status: 'courier_en_route_pickup',
        timeline: [{ status: 'courier_en_route_pickup', createdAt: now(), detail: 'Entregador a caminho da coleta' }],
        createdAt: now(),
        updatedAt: now(),
      };
      this.deliveryTasks.unshift(task);
    }

    for (const candidate of this.offers.filter((current) => current.orderId === offer.orderId && current.id !== offer.id)) {
      candidate.status = 'expired';
    }

    this.persist();
    this.publishEvent('dispatch.offer_accepted', { offerId: offer.id, orderId: offer.orderId, courierId: offer.courierId });
    return { offer, task, order };
  }

  getTask(taskId) {
    return this.deliveryTasks.find((task) => task.id === taskId) ?? null;
  }

  postLedgerEntry(entry) {
    const ledgerEntry = {
      id: randomUUID(),
      createdAt: now(),
      ...entry,
    };
    this.ledgerEntries.unshift(ledgerEntry);
    this.persist();
    return ledgerEntry;
  }

  listLedgerEntriesForMerchant(merchantId) {
    return this.ledgerEntries.filter((entry) => entry.accountType === 'merchant' && entry.accountId === merchantId);
  }

  updateTask(taskId, status) {
    const task = this.getTask(taskId);
    if (!task) {
      return null;
    }

    task.status = status;
    task.updatedAt = now();
    task.timeline.push({ status, createdAt: now(), detail: `Task atualizada para ${status}` });

    const order = this.getOrder(task.orderId);
    if (order) {
      const mappedStatus = status === 'completed' ? 'delivered' : status === 'picked_up' ? 'picked_up' : 'in_delivery';
      order.status = mappedStatus;
      this.appendTimeline(order, mappedStatus, `Entrega atualizada para ${status}`);

      if (status === 'completed') {
        const courier = this.couriers.find((candidate) => candidate.id === task.courierId);
        const merchant = this.getMerchant(order.merchantId);
        const courierEarning = Number((order.deliveryFee + 6).toFixed(2));
        const merchantNet = Number((order.subtotal - (order.subtotal * (merchant?.commissionRate ?? 0) / 100)).toFixed(2));

        if (courier) {
          courier.wallet.availableBalance = Number((courier.wallet.availableBalance + courierEarning).toFixed(2));
          courier.wallet.totalEarned = Number((courier.wallet.totalEarned + courierEarning).toFixed(2));
          courier.wallet.withdrawals.unshift({ id: randomUUID(), amount: courierEarning, kind: 'earning', createdAt: now() });
        }

        if (merchant) {
          merchant.walletBalance = Number((merchant.walletBalance + merchantNet).toFixed(2));
          this.postLedgerEntry({
            accountType: 'merchant',
            accountId: merchant.id,
            orderId: order.id,
            entryType: 'merchant_net_revenue',
            amount: merchantNet,
            meta: {
              subtotal: order.subtotal,
              commissionRate: merchant.commissionRate,
              discountAmount: order.discountAmount,
            },
          });
        }
      }
    }

    this.persist();
    this.publishEvent('delivery.status_updated', { taskId: task.id, orderId: task.orderId, courierId: task.courierId, status });
    return { task, order };
  }

  getCourier(courierId) {
    return this.couriers.find((courier) => courier.id === courierId) ?? null;
  }

  registerClient(response, channel, entityId) {
    const client = { response, channel, entityId };
    this.sseClients.add(client);
    return () => this.sseClients.delete(client);
  }

  publishEvent(type, payload) {
    const event = {
      id: randomUUID(),
      type,
      payload,
      createdAt: now(),
    };

    this.events.unshift(event);
    this.events = this.events.slice(0, 200);
    this.persist();

    for (const client of this.sseClients) {
      if (client.channel === 'merchant' && payload.merchantId && client.entityId !== payload.merchantId) {
        continue;
      }
      if (client.channel === 'courier' && payload.courierId && client.entityId !== payload.courierId) {
        continue;
      }

      client.response.write(`event: ${type}\n`);
      client.response.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    return event;
  }
}

export const store = new InMemoryStore();
