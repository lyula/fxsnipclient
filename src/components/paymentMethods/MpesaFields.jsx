import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { fetchWithAuth } from '../../utils/api';

const inputClass =
  "text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-3 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#a99d6b] bg-gray-50 dark:bg-gray-800 text-[#1E3A8A] dark:text-[#a99d6b] placeholder:text-[#a99d6b] dark:placeholder:text-[#a99d6b]";

function normalizeMpesaNumber(number) {
  // Accepts 07... or 2547... formats, returns 2547... format
  let n = number.trim();
  if (/^07\d{8}$/.test(n)) return '254' + n.slice(1);
  if (/^2547\d{8}$/.test(n)) return n;
  return null;
}

const MpesaFields = forwardRef(function MpesaFields({ billingType, pricing, amountKES, user, onSuccess, onError, onLoading }, ref) {
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = e => {
    setMpesaNumber(e.target.value);
    setError(null);
  };

  const handlePay = async () => {
    setError(null);
    if (onLoading) onLoading(true);
    setLoading(true);
    const normalized = normalizeMpesaNumber(mpesaNumber);
    if (!normalized) {
      setError('Enter a valid M-Pesa number (07... or 2547...)');
      setLoading(false);
      if (onLoading) onLoading(false);
      if (onError) onError('Invalid M-Pesa number');
      return false;
    }
    try {
      const res = await fetchWithAuth(`${import.meta.env.VITE_API_URL || ''}/badge-payments/initiate-stk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: normalized,
          amount: amountKES,
          customer_name: user?.username || 'Customer',
          billingType
        })
      });
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        setError('Unexpected server response.');
        if (onError) onError('Unexpected server response.');
        return false;
      }
      if (!res.ok || !data.CheckoutRequestID) {
        setError(data?.error || 'Failed to initiate payment.');
        if (onError) onError(data?.error || 'Failed to initiate payment.');
        return false;
      }
      if (onSuccess) onSuccess();
      return true;
    } catch (err) {
      setError(err.message || 'Payment failed');
      if (onError) onError(err.message || 'Payment failed');
      return false;
    } finally {
      setLoading(false);
      if (onLoading) onLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({ handlePay }));

  return (
    <div className="flex flex-col items-center w-full max-w-xs">
      <input
        type="text"
        name="mpesaNumber"
        placeholder="M-Pesa Phone Number"
        className={inputClass}
        value={mpesaNumber}
        onChange={handleInputChange}
        required
        style={{ letterSpacing: '2px' }}
        disabled={loading}
      />
      {error && <div className="text-red-600 text-sm font-semibold mt-1 w-full text-center">{error}</div>}
    </div>
  );
});

export default MpesaFields;
