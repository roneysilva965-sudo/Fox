export class DiscoveryService {
  constructor(store) {
    this.store = store;
  }

  getFeed(filters = []) {
    return this.store.listMerchants().map((merchant) => ({
      merchantId: merchant.id,
      tradeName: merchant.tradeName,
      deliveryTimeMin: merchant.deliveryTimeMin,
      distanceKm: merchant.distanceKm,
      tags: merchant.tags,
      categories: merchant.categories,
      score: this.calculateScore(merchant, filters),
    })).sort((left, right) => right.score - left.score);
  }

  calculateScore(merchant, filters) {
    let score = 100 - merchant.distanceKm * 5 - merchant.deliveryTimeMin * 0.7;
    if (filters.includes('free_delivery') && merchant.tags.some((tag) => tag.includes('frete grátis'))) {
      score += 25;
    }
    if (filters.includes('fast_delivery') && merchant.deliveryTimeMin <= 35) {
      score += 20;
    }
    return Number(score.toFixed(2));
  }
}
