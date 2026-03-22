const feedOutput = document.getElementById('feedOutput');
const walletOutput = document.getElementById('walletOutput');
const pricingOutput = document.getElementById('pricingOutput');
const orderOutput = document.getElementById('orderOutput');

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  return response.json();
}

async function loadFeed() {
  const payload = await api('/customer/discovery/feed?filters=fast_delivery,free_delivery');
  feedOutput.textContent = JSON.stringify(payload.data, null, 2);
}

async function loadWallet() {
  const payload = await api('/customer/wallet?phone=5511933333333');
  walletOutput.textContent = JSON.stringify(payload.data, null, 2);
}

document.getElementById('loadFeedButton').addEventListener('click', loadFeed);
document.getElementById('walletButton').addEventListener('click', loadWallet);

document.getElementById('pricingForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = await api('/customer/cart/price', {
    method: 'POST',
    body: JSON.stringify({
      merchantId: 'merchant-burger-house',
      couponCode: formData.get('couponCode'),
      items: [{ productId: formData.get('productId'), quantity: Number(formData.get('quantity')) }],
    }),
  });
  pricingOutput.textContent = JSON.stringify(payload.data, null, 2);
});

document.getElementById('orderForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = await api('/customer/orders', {
    method: 'POST',
    body: JSON.stringify({
      merchantId: 'merchant-burger-house',
      customerName: formData.get('customerName'),
      customerPhone: formData.get('customerPhone'),
      couponCode: formData.get('couponCode'),
      items: [{ productId: formData.get('productId'), quantity: Number(formData.get('quantity')) }],
    }),
  });
  orderOutput.textContent = JSON.stringify(payload.data, null, 2);
  await loadWallet();
});
