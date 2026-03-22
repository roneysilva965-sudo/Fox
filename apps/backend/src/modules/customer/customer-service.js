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
      couponCode: order.couponCode,
      cashbackEarned: order.cashbackEarned,
      timeline: order.timeline,
      totals: {
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        serviceFee: order.serviceFee,
        discountAmount: order.discountAmount,
        total: order.total,
      },
    };
  }
}
