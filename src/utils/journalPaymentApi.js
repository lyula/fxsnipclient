export async function getJournalPaymentStatus(paymentId) {
  const res = await axios.get(`${API_URL}/journal-payments/status`, {
    params: { paymentId },
    headers: {
      ...getAuthHeaders(),
    },
    withCredentials: true,
  });
  return res.data;
}
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createJournalPayment({ journalType, phone, billingType, amount, customer_name }) {
  // If amount is provided, treat as KES (from modal), else fallback to USD logic
  let payloadAmount;
  if (typeof amount === 'number') {
    payloadAmount = amount;
  } else {
    // fallback for legacy calls: convert USD to KES
    let priceUSD = journalType === 'screenrecording' ? 9.99 : 2.0;
    let usdToKes = 130;
    try {
      const pricing = JSON.parse(localStorage.getItem('journalPricing'));
      if (pricing && pricing.usdToKes) usdToKes = pricing.usdToKes;
    } catch {}
    payloadAmount = Math.round(priceUSD * usdToKes);
  }
  const payload = {
    amount: payloadAmount,
    phone_number: phone,
    journalType,
    billingType,
    customer_name
  };
  // Remove undefined fields
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  const res = await axios.post(
    `${API_URL}/journal-payments`,
    payload,
    {
      headers: {
        ...getAuthHeaders(),
      },
      withCredentials: true,
    }
  );
  return res.data;
}

export async function getLatestJournalPayment() {
  const res = await axios.get(`${API_URL}/journal-payments/latest`, {
    headers: {
      ...getAuthHeaders(),
    },
    withCredentials: true,
  });
  return res.data;
}

export async function getAllJournalPayments() {
  const res = await axios.get(`${API_URL}/journal-payments`, {
    headers: {
      ...getAuthHeaders(),
    },
    withCredentials: true,
  });
  return res.data;
}

export async function getJournalPricing() {
  const res = await axios.get(`${API_URL}/journal-pricing`);
  return res.data;
}
