import { canTransition } from './order-state-machine.js';

export class OrderService {
  constructor(store) {
    this.store = store;
  }

  createCustomerOrder(payload) {
    return this.store.createOrder(payload);
  }

  acceptOrder(orderId, prepTimeMin) {
    const order = this.store.updateOrder(orderId, (current) => {
      if (!canTransition(current.status, 'merchant_received')) {
        throw new Error(`Cannot accept order in status ${current.status}`);
      }

      current.status = 'merchant_received';
      current.prepTimeMin = prepTimeMin;
      this.store.appendTimeline(current, 'merchant_received', `Pedido aceito com preparo inicial de ${prepTimeMin} min`);
    });

    if (!order) {
      return null;
    }

    this.store.publishEvent('order.accepted', { orderId: order.id, merchantId: order.merchantId, status: order.status, prepTimeMin });
    return order;
  }

  rejectOrder(orderId, reason) {
    const order = this.store.updateOrder(orderId, (current) => {
      if (!canTransition(current.status, 'rejected_by_merchant')) {
        throw new Error(`Cannot reject order in status ${current.status}`);
      }

      current.status = 'rejected_by_merchant';
      current.rejectionReason = reason;
      this.store.appendTimeline(current, 'rejected_by_merchant', `Pedido rejeitado: ${reason}`);
    });

    if (!order) {
      return null;
    }

    this.store.publishEvent('order.rejected', { orderId: order.id, merchantId: order.merchantId, status: order.status, reason });
    return order;
  }

  updateStatus(orderId, nextStatus) {
    const order = this.store.updateOrder(orderId, (current) => {
      if (!canTransition(current.status, nextStatus)) {
        throw new Error(`Cannot transition ${current.status} -> ${nextStatus}`);
      }

      current.status = nextStatus;
      this.store.appendTimeline(current, nextStatus, `Status alterado para ${nextStatus}`);
    });

    if (!order) {
      return null;
    }

    let offers = [];
    if (nextStatus === 'ready_for_pickup') {
      offers = this.store.createDeliveryOffers(order);
    }

    this.store.publishEvent('order.status_updated', { orderId: order.id, merchantId: order.merchantId, status: order.status, offersCreated: offers.length });
    return { order, offers };
  }

  listMerchantOrders(merchantId, status) {
    return this.store.listOrdersByMerchant(merchantId, status);
  }

  getOrder(orderId) {
    return this.store.getOrder(orderId);
  }
}
