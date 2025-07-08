import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "";
const PAYMENTS_CACHE_KEY = "fxsnip_payments_cache";
const PAYMENTS_CACHE_TIME_KEY = "fxsnip_payments_cache_time";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;
  const navigate = useNavigate();

  // Pagination logic
  const totalPages = Math.ceil(payments.length / recordsPerPage);
  const paginatedPayments = payments.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      setError(null);
      try {
        // Try sessionStorage cache first
        const cached = sessionStorage.getItem(PAYMENTS_CACHE_KEY);
        const cachedTime = sessionStorage.getItem(PAYMENTS_CACHE_TIME_KEY);
        if (cached && cachedTime && Date.now() - Number(cachedTime) < CACHE_TTL) {
          setPayments(JSON.parse(cached));
          setLoading(false);
          return;
        }
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/badge-payments/my`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true
        });
        // Defensive: always set as array
        let data = res.data;
        if (!Array.isArray(data)) {
          if (data == null) data = [];
          else data = [data];
        }
        setPayments(data);
        sessionStorage.setItem(PAYMENTS_CACHE_KEY, JSON.stringify(data));
        sessionStorage.setItem(PAYMENTS_CACHE_TIME_KEY, Date.now().toString());
      } catch (err) {
        setError("Failed to fetch payments");
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  return (
    <div className="w-full flex-1 mx-0 p-0">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 md:p-8 w-full h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Payments</h2>
          <button
            className="px-3 py-1.5 rounded font-semibold shadow transition focus:outline-none focus:ring-2 text-sm"
            style={{ backgroundColor: '#a99d6b', color: '#fff' }}
            type="button"
            onClick={() => navigate('/dashboard/ad-creation')}
          >
            Run Ad
          </button>
        </div>
        {loading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : payments.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400">No payments found.</div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedPayments.map((payment, idx) => {
                const isSuccess = payment.status === "success" || payment.status === "completed";
                return (
                  <div
                    key={payment._id || payment.id || idx}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-4 flex flex-col gap-2 transition-colors duration-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 w-full"
                    onClick={() => navigate(`/dashboard/payment/${payment._id || payment.id || idx}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Amount:</span>
                      <span className={`font-bold text-lg ${
                        isSuccess
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}>
                        {isSuccess ? (payment.currency || "KES") : "KES"} {payment.amount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
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
                      <span className="font-semibold text-gray-700 dark:text-gray-200">Status:</span>
                      <span className={`uppercase font-bold ${
                        isSuccess
                          ? "text-green-700 dark:text-green-300"
                          : "text-red-700 dark:text-red-300"
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination Controls */}
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="text-gray-700 dark:text-gray-200">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
