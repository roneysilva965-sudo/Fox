export class CourierService {
  constructor(store) {
    this.store = store;
  }

  listActiveOffers(courierId) {
    return this.store.listActiveOffers(courierId);
  }

  acceptOffer(offerId) {
    return this.store.acceptOffer(offerId);
  }

  updateTask(taskId, status) {
    return this.store.updateTask(taskId, status);
  }

  getWallet(courierId) {
    const courier = this.store.getCourier(courierId);
    if (!courier) {
      return null;
    }

    return {
      courierId,
      availableBalance: courier.wallet.availableBalance,
      totalEarned: courier.wallet.totalEarned,
      history: courier.wallet.withdrawals,
    };
  }
}
