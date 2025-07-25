

import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function PaymentDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // Instead of fetching only one type, fetch both badge and journal payments, merge, and find by ID
  useEffect(() => {
    async function fetchPayment() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        // Fetch both payment types in parallel
        const [badgeRes, journalRes] = await Promise.all([
          axios.get(`${API_URL}/badge-payments/my`, { headers, withCredentials: true }),
          axios.get(`${API_URL}/journal-payments`, { headers, withCredentials: true })
        ]);
        let badgePayments = badgeRes.data || [];
        let journalPayments = journalRes.data || [];
        if (!Array.isArray(badgePayments)) badgePayments = badgePayments ? [badgePayments] : [];
        if (!Array.isArray(journalPayments)) journalPayments = journalPayments ? [journalPayments] : [];
        // Add _paymentType for clarity
        badgePayments = badgePayments.map(p => ({ ...p, _paymentType: "badge" }));
        journalPayments = journalPayments.map(p => ({ ...p, _paymentType: "journal" }));
        const allPayments = [...badgePayments, ...journalPayments];
        // Find by id (string or object id)
        const found = allPayments.find(p => (p._id || p.id) === id || String(p._id || p.id) === id);
        setPayment(found || null);
      } catch (err) {
        setError("Failed to fetch payment details");
      } finally {
        setLoading(false);
      }
    }
    fetchPayment();
  }, [id]);

  if (loading) return <div className="text-gray-500 dark:text-gray-400 p-8">Loading...</div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;
  if (!payment) return <div className="text-gray-500 dark:text-gray-400 p-8">Payment not found.</div>;

  // Determine payment type from _paymentType (added above)
  const isJournal = payment._paymentType === "journal";
  const isSuccess = payment.status === "success" || payment.status === "completed";

  // Unified details for both payment types
  return (
    <div className="w-full max-w-xl mx-auto p-4" style={{ fontFamily: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, sans-serif`, fontSize: 'inherit' }}>
      <button
        className="mb-4 px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">{isJournal ? "Journal Payment Details" : "Payment Details"}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-200">M-Pesa Code:</span>
            <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
              {isJournal
                ? payment.mpesaCode || payment.code || payment.receipt || payment.rawResponse?.MpesaReceiptNumber || payment.rawResponse?.receipt || "-"
                : payment.mpesaCode || payment.code || "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Amount:</span>
            <span className={`font-bold text-lg ${isSuccess ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {isSuccess ? (payment.currency || "KES") : "KES"} {typeof payment.amount === 'number' ? payment.amount.toLocaleString() : (Number(payment.amount)?.toLocaleString?.() || payment.amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Date:</span>
            <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
              {payment.createdAt
                ? new Date(payment.createdAt).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                  })
                : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Reason:</span>
            <span className="text-gray-900 dark:text-gray-100">
              {isJournal
                ? payment.journalType === "screenrecording"
                  ? "Unlimited Journals + Screen Recordings"
                  : payment.journalType === "unlimited"
                  ? "Unlimited Journals (No Screen Recordings)"
                  : payment.journalType || "-"
                : payment.type === "verified_badge"
                ? "Blue Badge subscription"
                : payment.type
                ? `${payment.type.charAt(0).toUpperCase() + payment.type.slice(1)} badge subscription`
                : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Status:</span>
            <span className={`uppercase font-bold ${isSuccess ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {payment.status}
            </span>
          </div>
          {!isSuccess && (isJournal ? (payment.failureReason || payment.rawResponse?.ResultDesc) : payment.rawResponse?.ResultDesc) && (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700 dark:text-gray-200">Reason:</span>
              <span className="font-mono text-xs text-red-700 dark:text-red-300">{isJournal ? (payment.failureReason || payment.rawResponse?.ResultDesc) : payment.rawResponse?.ResultDesc}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Phone Number:</span>
            <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
              {isJournal
                ? payment.phone || payment.rawResponse?.Phone || payment.methodDetails?.MpesaReceiptNumber || "-"
                : payment.rawResponse?.Phone || payment.methodDetails?.MpesaReceiptNumber || "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Reference:</span>
            <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
              {isJournal
                ? payment.rawResponse?.ExternalReference || payment.rawResponse?.external_reference || payment.transactionId || "-"
                : payment.rawResponse?.ExternalReference || payment.rawResponse?.external_reference || "-"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
