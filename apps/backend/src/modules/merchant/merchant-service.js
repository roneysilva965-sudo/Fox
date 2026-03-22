export class MerchantService {
  constructor(store) {
    this.store = store;
  }

  getDashboard(merchantId) {
    const orders = this.store.listOrdersByMerchant(merchantId);
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((order) => order.status === 'delivered');
    const cancelledOrders = orders.filter((order) => ['rejected_by_merchant', 'cancelled_by_platform', 'failed_delivery'].includes(order.status));
    const revenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0);
    const averageTicket = deliveredOrders.length ? Number((revenue / deliveredOrders.length).toFixed(2)) : 0;

    const productSales = new Map();
    for (const order of orders) {
      for (const item of order.items) {
        productSales.set(item.name, (productSales.get(item.name) ?? 0) + item.quantity);
      }
    }

    const topProducts = [...productSales.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([name, quantity]) => ({ name, quantity }));

    return {
      merchantId,
      totalOrders,
      revenue: Number(revenue.toFixed(2)),
      averageTicket,
      cancellationRate: totalOrders ? Number(((cancelledOrders.length / totalOrders) * 100).toFixed(2)) : 0,
      topProducts,
      activeOrders: orders.filter((order) => !['delivered', 'rejected_by_merchant', 'cancelled_by_platform', 'failed_delivery'].includes(order.status)).length,
      walletBalance: this.store.getMerchant(merchantId)?.walletBalance ?? 0,
    };
  }

  getFinanceStatement(merchantId) {
    const ledgerEntries = this.store.listLedgerEntriesForMerchant(merchantId);
    const balance = ledgerEntries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      merchantId,
      balance: Number(balance.toFixed(2)),
      entries: ledgerEntries,
    };
  }
}
