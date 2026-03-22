const credentials = {
  phone: '5511922222222',
  role: 'courier',
};

const state = { token: null, acceptedTaskId: null };

const sessionStatus = document.getElementById('sessionStatus');
const offersOutput = document.getElementById('offersOutput');
const walletOutput = document.getElementById('walletOutput');
const acceptOutput = document.getElementById('acceptOutput');
const taskOutput = document.getElementById('taskOutput');

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
    body: JSON.stringify(credentials),
  });
  state.token = payload.data.token;
  sessionStatus.textContent = `Conectado como ${payload.data.user.fullName}`;
  await Promise.all([loadOffers(), loadWallet()]);
}

async function loadOffers() {
  const payload = await api('/courier/offers/active');
  offersOutput.textContent = JSON.stringify(payload.data, null, 2);
}

async function loadWallet() {
  const payload = await api('/courier/wallet');
  walletOutput.textContent = JSON.stringify(payload.data, null, 2);
}

document.getElementById('loginButton').addEventListener('click', login);
document.getElementById('refreshOffersButton').addEventListener('click', loadOffers);
document.getElementById('refreshWalletButton').addEventListener('click', loadWallet);

document.getElementById('acceptOfferForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const offerId = new FormData(event.currentTarget).get('offerId');
  const payload = await api(`/courier/offers/${offerId}/accept`, { method: 'POST' });
  state.acceptedTaskId = payload.data.task.id;
  acceptOutput.textContent = JSON.stringify(payload.data, null, 2);
  await loadOffers();
  await loadWallet();
});

document.getElementById('taskForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const taskId = formData.get('taskId') || state.acceptedTaskId;
  const payload = await api(`/courier/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: formData.get('status') }),
  });
  taskOutput.textContent = JSON.stringify(payload.data, null, 2);
  await loadWallet();
});
