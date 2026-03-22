export class AuthService {
  constructor(store) {
    this.store = store;
  }

  login(phone, role) {
    const user = this.store.findUserByPhoneRole(phone, role);
    if (!user) {
      return null;
    }

    const session = this.store.createSession(user);
    return {
      token: session.token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        merchantId: user.merchantId ?? null,
        courierId: user.courierId ?? null,
      },
    };
  }

  authenticate(token) {
    const session = this.store.findSession(token);
    if (!session) {
      return null;
    }

    const user = this.store.users.find((candidate) => candidate.id === session.userId);
    if (!user) {
      return null;
    }

    return {
      session,
      user,
    };
  }
}
