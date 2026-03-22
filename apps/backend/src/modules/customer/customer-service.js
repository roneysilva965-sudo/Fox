export class CustomerService {
  constructor(store) {
    this.store = store;
  }

  getTracking(orderId) {
    const order = this.store.getOrder(orderId);
    if (!order) {
      return null;
    }

    return {
      orderId: order.id,
      status: order.status,
      prepTimeMin: order.prepTimeMin,
      timeline: order.timeline,
      totals: {
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
      },
    };
  }
}
