export class CatalogService {
  constructor(store) {
    this.store = store;
  }

  listProducts(merchantId) {
    return this.store.listProductsByMerchant(merchantId);
  }

  createProduct(payload) {
    return this.store.createProduct(payload);
  }
}
