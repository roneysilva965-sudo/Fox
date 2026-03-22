export class AdminService {
  constructor(store) {
    this.store = store;
  }

  getOverview() {
    return this.store.getAdminOverview();
  }
}
