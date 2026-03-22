const seedCredentials = {
  phone: '5511911111111',
  role: 'merchant_owner',
};

const state = {
  token: null,
};

const sessionStatus = document.getElementById('sessionStatus');
const dashboardOutput = document.getElementById('dashboardOutput');
const settingsOutput = document.getElementById('settingsOutput');
const ordersOutput = document.getElementById('ordersOutput');
const catalogOutput = document.getElementById('catalogOutput');

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  return response.json();
}

async function login() {
  const payload = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify(seedCredentials),
  });
  state.token = payload.data.token;
  sessionStatus.textContent = `Conectado como ${payload.data.user.fullName}`;
  await Promise.all([loadDashboard(), loadSettings(), loadOrders(), loadCatalog()]);
}

async function loadDashboard() {
  const payload = await api('/merchant/dashboard');
  dashboardOutput.textContent = JSON.stringify(payload.data, null, 2);
}

async function loadSettings() {
  const payload = await api('/merchant/settings');
  settingsOutput.textContent = JSON.stringify(payload.data, null, 2);
  document.querySelector('[name="status"]').value = payload.data.status;
  document.querySelector('[name="averagePrepTimeMin"]').value = payload.data.averagePrepTimeMin;
}

async function loadOrders() {
  const payload = await api('/merchant/orders');
  ordersOutput.textContent = JSON.stringify(payload.data, null, 2);
}

async function loadCatalog() {
  const payload = await api('/merchant/catalog/products');
  catalogOutput.textContent = JSON.stringify(payload.data, null, 2);
}

document.getElementById('loginButton').addEventListener('click', login);
document.getElementById('refreshOrdersButton').addEventListener('click', loadOrders);

document.getElementById('settingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  await api('/merchant/settings', {
    method: 'PATCH',
    body: JSON.stringify({
      status: formData.get('status'),
      averagePrepTimeMin: Number(formData.get('averagePrepTimeMin')),
    }),
  });
  await loadSettings();
  await loadDashboard();
});

document.getElementById('productForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  await api('/merchant/catalog/products', {
    method: 'POST',
    body: JSON.stringify({
      name: formData.get('name'),
      basePrice: Number(formData.get('basePrice')),
      stockQuantity: Number(formData.get('stockQuantity')),
    }),
  });
  event.currentTarget.reset();
  await loadCatalog();
});
