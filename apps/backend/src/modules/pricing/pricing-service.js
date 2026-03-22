export class PricingService {
  constructor(store) {
    this.store = store;
  }

  priceCart(payload) {
    const items = (payload.items ?? []).map((item) => {
      const product = this.store.findProduct(item.productId);
      const quantity = Number(item.quantity ?? 1);
      const unitPrice = Number(product?.basePrice ?? item.unitPrice ?? 0);
      return {
        productId: item.productId,
        name: product?.name ?? item.name ?? 'Item',
        quantity,
        unitPrice,
        totalPrice: Number((unitPrice * quantity).toFixed(2)),
      };
    });

    const subtotal = Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
    const coupon = payload.couponCode ? this.store.findCoupon(payload.couponCode) : null;
    let deliveryFee = Number((payload.deliveryFee ?? 7.5).toFixed(2));
    let discountAmount = 0;

    if (coupon?.type === 'percentage') {
      discountAmount = Number(Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount ?? Number.POSITIVE_INFINITY).toFixed(2));
    }

    if (coupon?.type === 'free_delivery') {
      discountAmount = Number((discountAmount + deliveryFee).toFixed(2));
      deliveryFee = 0;
    }

    const serviceFee = Number((subtotal * 0.05).toFixed(2));
    const cashbackEarned = Number((subtotal * 0.03).toFixed(2));
    const total = Number((subtotal + deliveryFee + serviceFee - discountAmount).toFixed(2));

    return {
      merchantId: payload.merchantId,
      couponCode: coupon?.code ?? null,
      items,
      subtotal,
      deliveryFee,
      serviceFee,
      discountAmount,
      cashbackEarned,
      total,
    };
  }
}
