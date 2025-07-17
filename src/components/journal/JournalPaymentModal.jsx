import React, { useState, useRef, useEffect } from "react";
import { getJournalPricing, getJournalPaymentStatus } from '../../utils/journalPaymentApi';

const DEFAULT_PRICING = {
  unlimitedUSD: 2.0,
  screenrecordingUSD: 9.99,
  usdToKes: 130,
};

const JOURNAL_PAYMENT_OPTIONS = [
  {
    id: "unlimited",
    label: "Unlimited Journals (No Screen Recordings)",
    description: "$2/month for unlimited journals (no screen recordings)",
  },
  {
    id: "screenrecording",
    label: "Unlimited Journals + Screen Recordings",
    description: "$9.99/month for unlimited journals with screen recordings",
  },
];

const PAYMENT_METHODS = [
  { key: 'paypal', label: 'PayPal', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg' },
  { key: 'stripe', label: 'Stripe', logo: 'https://cdn.freebiesupply.com/images/large/2x/stripe-logo-white-on-blue.png' },
  { key: 'visa', label: 'Visa Card', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png' },
  { key: 'mastercard', label: 'MasterCard', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg' },
  { key: 'mpesa', label: 'M-Pesa', logo: 'https://inspireip.com/wp-content/uploads/2022/12/m-pesa.png' },
];

function normalizeMpesaNumber(number) {
  let n = number.trim();
  if (/^07\d{8}$/.test(n)) return "254" + n.slice(1);
  if (/^2547\d{8}$/.test(n)) return n;
  return null;
}

export default function JournalPaymentModal({ open, onClose, onPay, loading, error, userId, username }) {
  const [step, setStep] = useState(1); // 1: select plan, 2: select method, 3: enter details, 4: waiting, 5: result
  const [selected, setSelected] = useState(JOURNAL_PAYMENT_OPTIONS[0].id);
  const [selectedMethod, setSelectedMethod] = useState('mpesa');
  const [phone, setPhone] = useState("");
  const [payError, setPayError] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'failed' | null
  const [statusMessage, setStatusMessage] = useState("");
  const [mpesaLoading, setMpesaLoading] = useState(false);
  const [otherFields, setOtherFields] = useState({ paypalEmail: '', stripeToken: '', cardNumber: '', expiry: '', cvc: '' });
  const [pricing, setPricing] = useState(DEFAULT_PRICING);
  const [pricingLoading, setPricingLoading] = useState(true);
  const pollAttempts = useRef(0);
  const paymentIdRef = useRef(null);

  // Reset modal state to initial
  const resetModal = () => {
    setStep(1);
    setWaiting(false);
    setPaymentStatus(null);
    setStatusMessage("");
    setPhone("");
    setPayError("");
    setMpesaLoading(false);
    setOtherFields({ paypalEmail: '', stripeToken: '', cardNumber: '', expiry: '', cvc: '' });
    pollAttempts.current = 0;
    paymentIdRef.current = null;
  };

  useEffect(() => {
    async function fetchPricing() {
      try {
        setPricingLoading(true);
        const data = await getJournalPricing();
        setPricing({
          unlimitedUSD: data.unlimitedUSD ?? DEFAULT_PRICING.unlimitedUSD,
          screenrecordingUSD: data.screenrecordingUSD ?? DEFAULT_PRICING.screenrecordingUSD,
          usdToKes: data.usdToKes ?? DEFAULT_PRICING.usdToKes,
        });
      } catch (e) {
        setPricing(DEFAULT_PRICING);
      } finally {
        setPricingLoading(false);
      }
    }
    fetchPricing();
  }, []);

  useEffect(() => {
    if (!open) {
      resetModal();
    }
  }, [open]);

  if (!open) return null;

  const handleProceed = async () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) {
      setPayError("");
      setMpesaLoading(true);
      if (selectedMethod === 'mpesa') {
        const normalized = normalizeMpesaNumber(phone);
        if (!normalized) {
          setPayError("Enter a valid M-Pesa number (07... or 2547...)");
          setMpesaLoading(false);
          return;
        }
        try {
          // Calculate correct KES amount based on selected plan and USD to KES rate
          const planPriceUSD = selected === 'screenrecording' ? pricing.screenrecordingUSD : pricing.unlimitedUSD;
          const USD_TO_KES = pricing.usdToKes;
          const amountKES = Math.round(planPriceUSD * USD_TO_KES);
          const payResult = await onPay(selected, normalized, amountKES);
          // Store paymentId for polling
          paymentIdRef.current = payResult?.paymentId;
          setStep(4);
          setWaiting(true);
          pollAttempts.current = 0;
          pollPaymentStatus();
        } catch (e) {
          setPayError(e?.message || "Payment failed");
        } finally {
          setMpesaLoading(false);
        }
      } else {
        // Simulate payment for other methods
        setTimeout(() => {
          setPaymentStatus('success');
          setStatusMessage('Payment successful! Journal access granted.');
          setStep(5);
          setWaiting(false);
          setMpesaLoading(false);
        }, 2000);
      }
    }
  };

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else if (step === 4 || step === 5) {
      resetModal();
    }
  };

  // Poll backend for payment status and show failure reason if any
  const pollPaymentStatus = async () => {
    pollAttempts.current++;
    const paymentId = paymentIdRef.current;
    if (!paymentId) {
      setPaymentStatus('failed');
      setStatusMessage('Payment failed: No payment ID.');
      setStep(5);
      setWaiting(false);
      return;
    }
    try {
      const res = await getJournalPaymentStatus(paymentId);
      if (res.status === 'success') {
        setPaymentStatus('success');
        setStatusMessage('Payment successful! Journal access granted.');
        setStep(5);
        setWaiting(false);
        return;
      } else if (res.status === 'failed') {
        setPaymentStatus('failed');
        // Show the most specific failure reason, fallback to backend message, then generic
        let reason = res.failureReason || (res.payment && res.payment.failureReason) || (res.payment && res.payment.statusMessage) || res.message || 'Payment failed.';
        setStatusMessage(`Payment failed: ${reason}`);
        setStep(5);
        setWaiting(false);
        return;
      }
      // If still pending, poll again (max 12 attempts ~24s)
      if (pollAttempts.current < 12) {
        setTimeout(pollPaymentStatus, 2000);
      } else {
        setPaymentStatus('failed');
        setStatusMessage('Payment not completed. Please try again.');
        setStep(5);
        setWaiting(false);
      }
    } catch (err) {
      setPaymentStatus('failed');
      setStatusMessage('Error checking payment status.');
      setStep(5);
      setWaiting(false);
    }
  };

  const plan = JOURNAL_PAYMENT_OPTIONS.find(opt => opt.id === selected);
  const planPriceUSD = selected === 'screenrecording' ? pricing.screenrecordingUSD : pricing.unlimitedUSD;
  const USD_TO_KES = pricing.usdToKes;

  // Payment fields for each method
  function renderPaymentFields() {
    if (pricingLoading) {
      return <div className="text-center text-[#a99d6b] font-semibold">Loading pricing...</div>;
    }
    switch (selectedMethod) {
      case 'paypal':
        return (
          <input
            type="email"
            name="paypalEmail"
            placeholder="PayPal Email"
            className="text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-3 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#a99d6b] bg-gray-50 dark:bg-gray-800 text-[#1E3A8A] dark:text-[#a99d6b] placeholder:text-[#a99d6b] dark:placeholder:text-[#a99d6b]"
            value={otherFields.paypalEmail}
            onChange={e => setOtherFields(f => ({ ...f, paypalEmail: e.target.value }))}
            required
            disabled={mpesaLoading}
          />
        );
      case 'stripe':
        return (
          <input
            type="text"
            name="stripeToken"
            placeholder="Stripe Token"
            className="text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-3 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#a99d6b] bg-gray-50 dark:bg-gray-800 text-[#1E3A8A] dark:text-[#a99d6b] placeholder:text-[#a99d6b] dark:placeholder:text-[#a99d6b]"
            value={otherFields.stripeToken}
            onChange={e => setOtherFields(f => ({ ...f, stripeToken: e.target.value }))}
            required
            disabled={mpesaLoading}
          />
        );
      case 'visa':
      case 'mastercard':
        return (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <input
              type="text"
              name="cardNumber"
              placeholder="Card Number"
              className="text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#a99d6b] bg-gray-50 dark:bg-gray-800 text-[#1E3A8A] dark:text-[#a99d6b] placeholder:text-[#a99d6b] dark:placeholder:text-[#a99d6b]"
              value={otherFields.cardNumber}
              onChange={e => setOtherFields(f => ({ ...f, cardNumber: e.target.value }))}
              required
              disabled={mpesaLoading}
            />
            <input
              type="text"
              name="expiry"
              placeholder="MM/YY"
              className="text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#a99d6b] bg-gray-50 dark:bg-gray-800 text-[#1E3A8A] dark:text-[#a99d6b] placeholder:text-[#a99d6b] dark:placeholder:text-[#a99d6b]"
              value={otherFields.expiry}
              onChange={e => setOtherFields(f => ({ ...f, expiry: e.target.value }))}
              required
              disabled={mpesaLoading}
            />
            <input
              type="text"
              name="cvc"
              placeholder="CVC"
              className="text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#a99d6b] bg-gray-50 dark:bg-gray-800 text-[#1E3A8A] dark:text-[#a99d6b] placeholder:text-[#a99d6b] dark:placeholder:text-[#a99d6b]"
              value={otherFields.cvc}
              onChange={e => setOtherFields(f => ({ ...f, cvc: e.target.value }))}
              required
              disabled={mpesaLoading}
            />
          </div>
        );
      case 'mpesa':
        return (
          <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
            <div>
              <label className="block text-sm font-medium text-[#a99d6b] mb-1">USD Amount</label>
              <input
                type="text"
                value={plan ? `$${planPriceUSD}` : ''}
                readOnly
                className="w-full text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-800 text-[#a99d6b] placeholder:text-[#a99d6b] mb-1"
                tabIndex={-1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a99d6b] mb-1">KES Amount</label>
              <input
                type="text"
                value={plan ? `KSh ${(planPriceUSD * USD_TO_KES).toLocaleString()}` : ''}
                readOnly
                className="w-full text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-2 bg-gray-100 dark:bg-gray-800 text-[#a99d6b] placeholder:text-[#a99d6b] mb-1"
                tabIndex={-1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a99d6b] mb-1">M-Pesa Phone Number</label>
              <input
                type="text"
                name="mpesaNumber"
                placeholder="Enter a valid M-pesa number"
                className="w-full text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-2 bg-gray-50 dark:bg-gray-800 text-[#1E3A8A] dark:text-[#a99d6b] placeholder:text-[#a99d6b] dark:placeholder:text-[#a99d6b]"
                value={phone}
                onChange={e => { setPhone(e.target.value); setPayError(""); }}
                required
                style={{ letterSpacing: '2px', '::placeholder': { fontSize: '0.9rem' } }}
                disabled={mpesaLoading}
              />
              <style>{`
                input[name='mpesaNumber']::placeholder {
                  font-size: 0.9rem !important;
                }
              `}</style>
            </div>
            <button
              type="submit"
              className="mt-2 rounded-lg px-4 py-2 font-semibold"
              style={{ background: '#a99d6b', color: 'white' }}
              disabled={mpesaLoading || !phone}
            >
              {mpesaLoading ? 'Processing...' : `Make Payment`}
            </button>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
      <div
        className="relative flex flex-col w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-0 py-0"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
        <div className="px-6 py-6">
          {step === 1 && (
            <>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center tracking-tight">
                Choose Your Journal Plan
              </h3>
              <div className="flex flex-col gap-4 mb-4">
                {JOURNAL_PAYMENT_OPTIONS.map(opt => (
                  <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${selected === opt.id ? 'border-[#a99d6b] bg-[#f7f5ef] dark:bg-[#a99d6b]/10 ring-2 ring-[#a99d6b]' : 'border-gray-300 dark:border-gray-700'}`} style={selected === opt.id ? { boxShadow: '0 0 0 2px #a99d6b33' } : {}}>
                    <input
                      type="radio"
                      name="journalPaymentOption"
                      value={opt.id}
                      checked={selected === opt.id}
                      onChange={() => setSelected(opt.id)}
                      className="form-radio" style={{ accentColor: '#a99d6b' }}
                    />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{opt.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300">{opt.description}</div>
                    </div>
                    <div className="ml-auto font-bold" style={{ color: '#a99d6b' }}>${opt.id === 'screenrecording' ? pricing.screenrecordingUSD : pricing.unlimitedUSD}</div>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 justify-end">
                <button className="rounded-lg px-4 py-2 font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={onClose}>Cancel</button>
                <button className="rounded-lg px-4 py-2 font-semibold" style={{ background: '#a99d6b', color: 'white' }} onClick={handleProceed}>Proceed to Pay</button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 text-center tracking-tight">
                Choose Payment Method
              </h3>
              <div className="grid gap-3 mb-6">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    className={`flex items-center gap-3 border rounded-lg px-4 py-3 w-full shadow-sm hover:shadow-md transition ${selectedMethod === m.key ? 'bg-[#a99d6b] text-white ring-2 ring-[#a99d6b]' : 'bg-white text-gray-800 border-gray-200'}`}
                    style={selectedMethod === m.key ? { boxShadow: '0 0 0 2px #a99d6b33', borderColor: '#a99d6b' } : {}}
                    onClick={() => setSelectedMethod(m.key)}
                  >
                    <img src={m.logo} alt={m.label} className="h-10 w-auto object-contain" style={{ maxWidth: 120 }} />
                    <span className="font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-between">
                <button className="rounded-lg px-4 py-2 font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={handleBack}>Back</button>
                <button className="rounded-lg px-4 py-2 font-semibold" style={{ background: '#a99d6b', color: 'white' }} onClick={handleProceed}>Next</button>
              </div>
            </>
          )}
          {step === 3 && (
            <form onSubmit={e => { e.preventDefault(); handleProceed(); }} className="space-y-4">
              <div className="flex flex-col items-center gap-2 mb-2">
                <div className="flex flex-row items-center gap-4 mb-2">
                  <img src={PAYMENT_METHODS.find(m => m.key === selectedMethod)?.logo} alt={selectedMethod} className={selectedMethod === 'stripe' ? 'h-12 w-auto object-contain' : 'h-10 w-auto object-contain'} style={{ maxWidth: selectedMethod === 'stripe' ? 120 : 60 }} />
                </div>
                <h2 className="text-lg font-semibold text-[#1E3A8A] dark:text-[#a99d6b]">Enter {PAYMENT_METHODS.find(m => m.key === selectedMethod)?.label} Details</h2>
              </div>
              {renderPaymentFields()}
              {payError && <div className="text-red-600 text-sm font-semibold  mt-1 w-full text-center">{payError}</div>}
              {selectedMethod !== 'mpesa' && (
                <div className="flex gap-3 justify-between pt-2">
                  <button type="button" className="rounded-lg px-4 py-2 font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={handleBack}>Back</button>
                  <button type="submit" className="rounded-lg px-4 py-2 font-semibold" style={{ background: '#a99d6b', color: 'white' }} disabled={mpesaLoading || (selectedMethod === 'mpesa' && !phone)}>{mpesaLoading ? 'Processing...' : `Pay ${plan ? `$${planPriceUSD}` : ''}`}</button>
                </div>
              )}
            </form>
          )}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-2xl mb-4 text-[#a99d6b] font-bold">Waiting for Payment...</div>
              <div className="mb-2 text-gray-700 dark:text-gray-200">Please complete the payment on your phone.</div>
              <div className="mb-2 text-gray-500 dark:text-gray-400 text-sm">Do not close this window.</div>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#a99d6b] my-6"></div>
            </div>
          )}
          {step === 5 && (
            <div className="flex flex-col items-center justify-center py-8">
              {paymentStatus === 'success' ? (
                <>
                  <div className="flex flex-col items-center mb-4">
                    <div className="flex items-center justify-center mb-2">
                      <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-5" />
                        </svg>
                      </span>
                    </div>
                    <div className="text-3xl text-green-600 font-bold">Payment Successful!</div>
                  </div>
                  <div className="mb-2 text-gray-700 dark:text-gray-200">{statusMessage}</div>
                  <button className="mt-6 px-6 py-2 rounded" style={{ background: '#a99d6b', color: 'white' }} onClick={onClose}>Close</button>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-4 text-red-600 font-bold">Payment Failed</div>
                  <div className="mb-2 text-gray-700 dark:text-gray-200">{statusMessage}</div>
                  <button className="mt-6 px-6 py-2 rounded" style={{ background: '#a99d6b', color: 'white' }} onClick={onClose}>Close</button>
                </>
              )}
            </div>
          )}
          {error && <div className="text-center text-red-600 font-semibold py-4">{error}</div>}
        </div>
      </div>
    </div>
  );
}