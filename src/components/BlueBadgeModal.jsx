import React, { useState, useEffect, useRef, forwardRef } from 'react';
import VerifiedBadge from './VerifiedBadge';
import { fetchWithAuth } from '../utils/api';
import { useAuth } from '../context/auth';
import MpesaFields from './paymentMethods/MpesaFields';
import PaypalFields from './paymentMethods/PaypalFields';
import StripeFields from './paymentMethods/StripeFields';
import CardFields from './paymentMethods/CardFields';

const ADVANTAGES = [
  'Increased post visibility in the Vibe section',
  'Priority support',
  'Exclusive badge on your profile',
  'Access to special features (coming soon)'
];

const PAYMENT_METHODS = [
  { key: 'paypal', label: 'PayPal' },
  { key: 'stripe', label: 'Stripe' },
  { key: 'visa', label: 'Visa Card' },
  { key: 'mastercard', label: 'MasterCard' },
  { key: 'mpesa', label: 'M-Pesa' }
];

// Payment method logos
const paymentLogos = {
  paypal: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg',
  stripe: 'https://cdn.freebiesupply.com/images/large/2x/stripe-logo-white-on-blue.png',
  visa: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png',
  mastercard: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg',
  mpesa: 'https://inspireip.com/wp-content/uploads/2022/12/m-pesa.png'
};

const inputClass =
  "text-center text-xl font-semibold border-2 border-[#a99d6b] rounded-lg px-4 py-3 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-[#a99d6b] bg-gray-50 dark:bg-gray-800 text-[#1E3A8A] dark:text-[#a99d6b] placeholder:text-[#a99d6b] dark:placeholder:text-[#a99d6b]";

const PaymentFields = forwardRef(({ method, onChange, billingType, setBillingType, pricing, ...rest }, ref) => {
  // Calculate KES amount for the selected billing type
  const amountKES = pricing
    ? (billingType === 'annual'
        ? Math.round(pricing.badgeAnnualUSD * pricing.usdToKes)
        : Math.round(pricing.badgeMonthlyUSD * pricing.usdToKes))
    : undefined;

  // Add billing options and amount fields for all methods
  return (
    <>
      <div className="flex gap-2 mb-4 w-full max-w-xs mx-auto">
        <button
          type="button"
          className={`flex-1 px-3 py-2 rounded-lg font-semibold border transition text-center ${billingType === 'monthly' ? 'bg-[#a99d6b] text-white border-[#a99d6b]' : 'bg-white text-[#a99d6b] border-[#a99d6b]'}`}
          onClick={() => setBillingType('monthly')}
          disabled={rest.loading}
        >
          Monthly
        </button>
        <button
          type="button"
          className={`flex-1 px-3 py-2 rounded-lg font-semibold border transition text-center ${billingType === 'annual' ? 'bg-[#a99d6b] text-white border-[#a99d6b]' : 'bg-white text-[#a99d6b] border-[#a99d6b]'}`}
          onClick={() => setBillingType('annual')}
          disabled={rest.loading}
        >
          Annual <span className="ml-1 text-xs font-bold text-green-600">(20% off)</span>
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-center">
        <div className="flex flex-col items-center w-full max-w-xs">
          <label className="text-xs text-[#a99d6b] dark:text-[#a99d6b] font-semibold">Amount (USD)</label>
          <input
            type="text"
            value={pricing ? (billingType === 'annual' ? `$${Number(pricing.badgeAnnualUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${Number(pricing.badgeMonthlyUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`) : ''}
            readOnly
            className={inputClass}
            style={{ letterSpacing: '2px' }}
          />
        </div>
        <div className="flex flex-col items-center w-full max-w-xs">
          <label className="text-xs text-[#a99d6b] dark:text-[#a99d6b] font-semibold">Amount (KES)</label>
          <input
            type="text"
            value={pricing ? (billingType === 'annual' ? `KES ${Math.round(pricing.badgeAnnualUSD * pricing.usdToKes).toLocaleString()}` : `KES ${Math.round(pricing.badgeMonthlyUSD * pricing.usdToKes).toLocaleString()}`) : ''}
            readOnly
            className={inputClass}
            style={{ letterSpacing: '2px' }}
          />
        </div>
      </div>
      {/* Payment fields based on method */}
      <div className="flex flex-col items-center justify-center w-full gap-2">
        {(() => {
          switch (method) {
            case 'paypal':
              return <PaypalFields onChange={onChange} />;
            case 'stripe':
              return <StripeFields onChange={onChange} />;
            case 'visa':
            case 'mastercard':
              return <CardFields onChange={onChange} />;
            case 'mpesa':
              // Pass ref to MpesaFields
              return <MpesaFields 
                ref={ref}
                billingType={billingType}
                pricing={pricing}
                amountKES={amountKES}
                user={rest.user}
                onSuccess={rest.onSuccess}
                onError={rest.onError}
                onLoading={rest.onLoading}
              />;
            default:
              return null;
          }
        })()}
      </div>
    </>
  );
});

const API_BASE = import.meta.env.VITE_API_URL || '';

const BlueBadgeModal = ({ open, onClose, userId }) => {
  const { user: currentUser, refreshUser } = useAuth();
  // State variables
  const [step, setStep] = useState(1); // 1: info, 2: payment methods, 3: payment fields, 4: waiting, 5: result
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({});
  const [billingType, setBillingType] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'failed' | null
  const [statusMessage, setStatusMessage] = useState('');
  const [polling, setPolling] = useState(false);
  const [pricing, setPricing] = useState(null);
  const mpesaPayRef = useRef();

  useEffect(() => {
    if (open) {
      resetModal();
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/badge-pricing`)
        .then(res => res.json())
        .then(setPricing);
    }
  }, [open]);

  // Reset modal state to initial values
  const resetModal = () => {
    setStep(1);
    setSelectedMethod(null);
    setPaymentDetails({});
    setBillingType('monthly');
    setLoading(false);
    setError(null);
    setPaymentStatus(null);
    setStatusMessage('');
    setPolling(false);
  };

  //forcing redeplyoment
  // Wrap onClose to reset modal state and refresh user if payment was successful
  const handleClose = () => {
    if (paymentStatus === 'success' && typeof refreshUser === 'function') {
      refreshUser();
    }
    resetModal();
    if (onClose) onClose();
  };

  const pollPaymentStatus = async () => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 20; // ~1 minute
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 3000));
      const res = await fetchWithAuth(`${API_BASE}/badge-payments/latest`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'completed') {
          setPaymentStatus('success');
          setStatusMessage('Payment successful!');
          setStep(5);
          setPolling(false);
          return;
        } else if (data.status === 'failed') {
          setPaymentStatus('failed');
          setStatusMessage(data.methodDetails?.ResultDesc || 'Payment failed or cancelled.');
          setStep(5);
          setPolling(false);
          return;
        }
      }
      attempts++;
    }
    setPaymentStatus('failed');
    setStatusMessage('Payment timed out.');
    setStep(5);
    setPolling(false);
  };

  const handleProceed = async () => {
    if (step === 1) setStep(2);
    else if (step === 2 && selectedMethod) setStep(3);
    // Step 3: Payment is now handled by the payment method component (e.g., MpesaFields)
  };

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setPaymentDetails({});
  };

  const handleInputChange = (e) => {
    setPaymentDetails({ ...paymentDetails, [e.target.name]: e.target.value });
  };

  // New callbacks for modular payment methods
  const handleMpesaSuccess = () => {
    setStep(4); // Go to waiting page
    setTimeout(pollPaymentStatus, 1000);
  };
  const handleMpesaError = (errMsg) => {
    setError(errMsg);
    setLoading(false);
    setTimeout(() => setError(null), 3000);
  };
  const handleMpesaLoading = (isLoading) => {
    setLoading(isLoading);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-2 sm:px-0">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-0 w-full max-w-md relative mx-auto border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ margin: '32px 0', minWidth: 320 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-[#f7f6f2] to-[#e9e6d8] dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#1E3A8A] dark:text-[#a99d6b]">Get Blue Badge</span>
            <VerifiedBadge />
          </div>
          <button
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl font-bold"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-6">
          {step === 1 && (
            <>
              <ul className="mb-6 list-disc pl-5 text-gray-700 dark:text-gray-200 text-base">
                {ADVANTAGES.map((adv, i) => (
                  <li key={i}>{adv}</li>
                ))}
              </ul>
              <div className="flex gap-3 justify-end">
                <button className="rounded-lg px-4 py-2 font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={handleClose}>Cancel</button>
                <button className="rounded-lg px-4 py-2 font-semibold" style={{ background: '#a99d6b', color: 'white' }} onClick={handleProceed}>Proceed to Pay</button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold mb-4 text-center text-[#1E3A8A] dark:text-[#a99d6b]">Choose Payment Method</h2>
              <div className="grid gap-3 mb-6">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    className={`flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3 w-full shadow-sm hover:shadow-md transition 
    ${selectedMethod === m.key ? 'bg-black/80 text-white ring-2 ring-black/40' : 'bg-white text-gray-800'}`}
                    onClick={() => handleMethodSelect(m.key)}
                  >
                    <img 
                      src={paymentLogos[m.key]} 
                      alt={m.label} 
                      className={
                        m.key === 'stripe' ? 'h-12 w-auto object-contain' :
                        m.key === 'mpesa' ? 'h-12 w-auto object-contain' :
                        'h-6 w-auto object-contain'
                      }
                      style={{ maxWidth: m.key === 'stripe' || m.key === 'mpesa' ? 120 : 60 }}
                    />
                    <span className="font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 justify-between">
                <button className="rounded-lg px-4 py-2 font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={handleBack}>Back</button>
                <button className="rounded-lg px-4 py-2 font-semibold" style={{ background: '#a99d6b', color: 'white' }} onClick={handleProceed} disabled={!selectedMethod}>Next</button>
              </div>
            </>
          )}
          {step === 3 && (
            <form
              onSubmit={e => { e.preventDefault(); /* Payment handled by payment method component */ }}
              className="space-y-4"
            >
              <div className="flex flex-col items-center gap-2 mb-2">
                {selectedMethod === 'mpesa' ? (
                  <>
                    <div className="flex flex-row items-center gap-4 mb-2">
                      <img 
                        src={paymentLogos['mpesa']} 
                        alt="M-Pesa" 
                        className="h-12 w-auto object-contain"
                        style={{ maxWidth: 120 }}
                      />
                      <img
                        src="https://docs.payhero.co.ke/pay-hero-developer-apis/~gitbook/image?url=https%3A%2F%2F976974083-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252Fkta6PrvVTasz1IT7LtTm%252Fuploads%252F18j5TfxVgdnDEp29cIxa%252FPayHero1-dm%2520-%2520Copy.png%3Falt%3Dmedia%26token%3D979b1ffa-8b44-4b51-97c9-38897d60a244&width=768&dpr=4&quality=100&sign=4eb419db&sv=2"
                        alt="PayHero Kenya"
                        className="h-16 w-auto object-contain"
                        style={{ maxWidth: 160 }}
                      />
                    </div>
                    <h2 className="text-lg font-semibold text-[#1E3A8A] dark:text-[#a99d6b]">Enter M-Pesa Details</h2>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <img 
                      src={paymentLogos[selectedMethod]} 
                      alt={selectedMethod} 
                      className={
                        selectedMethod === 'stripe' ? 'h-12 w-auto object-contain' :
                        'h-6 w-auto object-contain'
                      }
                      style={{ maxWidth: selectedMethod === 'stripe' ? 120 : 60 }}
                    />
                    <h2 className="text-lg font-semibold text-[#1E3A8A] dark:text-[#a99d6b]">Enter {PAYMENT_METHODS.find(m => m.key === selectedMethod)?.label} Details</h2>
                  </div>
                )}
              </div>
              {pricing && (
                <PaymentFields 
                  ref={selectedMethod === 'mpesa' ? mpesaPayRef : undefined}
                  method={selectedMethod} 
                  onChange={handleInputChange} 
                  billingType={billingType} 
                  setBillingType={setBillingType} 
                  pricing={pricing}
                  amountKES={
                    pricing
                      ? (billingType === 'annual'
                          ? Math.round(pricing.badgeAnnualUSD * pricing.usdToKes)
                          : Math.round(pricing.badgeMonthlyUSD * pricing.usdToKes))
                      : undefined
                  }
                  user={currentUser}
                  onSuccess={handleMpesaSuccess}
                  onError={handleMpesaError}
                  onLoading={handleMpesaLoading}
                />
              )}
              {selectedMethod === 'mpesa' && (
                <div className="flex gap-3 justify-between pt-2">
                  <button type="button" className="rounded-lg px-4 py-2 font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={handleBack}>Back</button>
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 font-semibold" style={{ background: '#a99d6b', color: 'white' }}
                    onClick={async () => { if (mpesaPayRef.current) await mpesaPayRef.current.handlePay(); }}
                  >
                    Proceed to Pay
                  </button>
                </div>
              )}
              {selectedMethod !== 'mpesa' && (
                <div className="flex gap-3 justify-between pt-2">
                  <button type="button" className="rounded-lg px-4 py-2 font-semibold bg-red-600 text-white hover:bg-red-700 transition" onClick={handleBack}>Back</button>
                  <button type="submit" className="rounded-lg px-4 py-2 font-semibold" style={{ background: '#a99d6b', color: 'white' }}>Proceed to Pay</button>
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
                  <div className="mb-2 text-gray-700 dark:text-gray-200">Your badge will be activated shortly.</div>
                  <button className="mt-6 px-6 py-2 rounded bg-[#a99d6b] text-white font-semibold" onClick={handleClose}>Close</button>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-4 text-red-600 font-bold">Payment Failed</div>
                  <div className="mb-2 text-gray-700 dark:text-gray-200">{statusMessage}</div>
                  <button className="mt-6 px-6 py-2 rounded bg-[#a99d6b] text-white font-semibold" onClick={handleClose}>Close</button>
                </>
              )}
            </div>
          )}
          {loading && <div className="text-center text-[#a99d6b] font-semibold py-4">Processing payment, please wait...</div>}
          {error && <div className="text-center text-red-600 font-semibold py-4">{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default BlueBadgeModal;
