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

  getWalletByPhone(phone) {
    const customer = this.store.users.find((user) => user.phone === phone && user.role === 'customer');
    if (!customer) {
      return null;
    }

    return {
      customerId: customer.id,
      availableBalance: Number((customer.walletBalance ?? 0).toFixed(2)),
    };
  }
}
