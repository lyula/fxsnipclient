import { useState, useEffect, useRef } from "react";
import JournalPaymentModal from "../../components/journal/JournalPaymentModal";
import { createJournalPayment, getLatestJournalPayment } from '../../utils/journalPaymentApi';
import { useNavigate } from "react-router-dom";
import JournalMarkets from "./JournalMarkets";
import ModalPortal from "../../components/ModalPortal";
import JournalBeforeModal from "../../components/JournalBeforeModal";
import JournalAfterModal from "../../components/JournalAfterModal";
import {
  getJournalEntries,
  postJournalEntry,
  deleteJournalEntry,
  updateJournalEntry
} from '../../utils/journalApi';
import { uploadToCloudinary } from '../../utils/cloudinaryUpload';

function Journal() {
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [pendingPaymentType, setPendingPaymentType] = useState(null);
  const [pendingPhone, setPendingPhone] = useState("");
  // For 3-dots menu state
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRefs = useRef({});

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuOpenId && menuRefs.current[menuOpenId] && !menuRefs.current[menuOpenId].contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [entries, setEntries] = useState([]);
  const [zoomMedia, setZoomMedia] = useState(null); // { url, type, label }
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [showAfterEditModal, setShowAfterEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creationForm, setCreationForm] = useState({
    type: "Buy",
    pair: "",
    strategy: "",
    emotions: "",
    confluences: "",
    beforeScreenshot: null,
    beforeScreenRecording: null,
    timeEntered: ""
  });
  const [afterForm, setAfterForm] = useState({
    outcome: "",
    afterScreenshot: null,
    afterScreenRecording: null,
    timeAfterPlayout: ""
  });
  const [editingId, setEditingId] = useState(null); // Track if editing (for inline edit mode)
  const [editingEntry, setEditingEntry] = useState(null); // Track entry being edited
  const navigate = useNavigate();

  // Fetch journal entries
  useEffect(() => {
    setLoading(true);
    getJournalEntries(page, 4)
      .then(({ entries, total }) => {
        setEntries(entries);
        setTotalPages(Math.ceil(total / 4));
      })
      .finally(() => setLoading(false));
  }, [page]);

  // Open modal for new entry and clear form
  // Payment enforcement before allowing new entry
  const handleNewEntry = async () => {
    setLoading(true);
    setPaymentError("");
    try {
      // Check latest payment status
      const payment = await getLatestJournalPayment();
      const now = new Date();
      let hasAccess = false;
      if (payment && payment.status === 'success') {
        if (payment.period === 'annual') {
          const paidDate = new Date(payment.createdAt);
          hasAccess = (now - paidDate) < 365 * 24 * 60 * 60 * 1000;
        } else if (payment.period === 'monthly') {
          const paidDate = new Date(payment.createdAt);
          hasAccess = (now - paidDate) < 30 * 24 * 60 * 60 * 1000;
        }
      }
      if (!hasAccess) {
        setShowPaymentModal(true);
        setLoading(false);
        return;
      }
      // If access, proceed to show creation modal
      const nowDate = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const localDatetime = `${nowDate.getFullYear()}-${pad(nowDate.getMonth() + 1)}-${pad(nowDate.getDate())}T${pad(nowDate.getHours())}:${pad(nowDate.getMinutes())}`;
      setCreationForm({
        type: "Buy",
        pair: "",
        strategy: "",
        emotions: "",
        confluences: "",
        beforeScreenshot: null,
        beforeScreenRecording: null,
        timeEntered: localDatetime
      });
      setEditingId(null);
      setShowCreationModal(true);
    } catch (err) {
      setPaymentError("Failed to check payment status. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  // Handle payment modal actions
  // Accept amount in KES from modal (for M-Pesa)
  const handlePay = async (journalType, phone, amount, billingType = 'monthly') => {
    setPaymentLoading(true);
    setPaymentError("");
    try {
      // Compose all required fields for backend
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const customer_name = user.username || user.name || undefined;
      // amount is now passed in KES for M-Pesa
      const res = await createJournalPayment({
        journalType,
        phone,
        billingType,
        customer_name,
        amount
      });
      // Return paymentId or payment object for polling
      if (res && res.data && res.data.CheckoutRequestID) {
        // Try to get paymentId from backend if available
        // You may want to fetch the payment by transactionId if needed
        return { paymentId: res.data._id, transactionId: res.data.CheckoutRequestID };
      }
      if (res && res._id) {
        return { paymentId: res._id };
      }
      return res;
    } catch (err) {
      setPaymentError(err?.response?.data?.error || 'Payment failed. Please try again.');
      throw err;
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle creation form submit (add or update before fields)
  const handleCreationSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const buildMediaField = async (field, type) => {
      if (creationForm[field] instanceof File) {
        return await uploadToCloudinary(creationForm[field], type);
      } else if (creationForm[field] && creationForm[field].url) {
        return creationForm[field];
      } else {
        return null;
      }
    };
    let timeEntered = creationForm.timeEntered;
    if (timeEntered) {
      const localDate = new Date(timeEntered);
      const pad = (n) => n.toString().padStart(2, '0');
      const offset = -localDate.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const absOffset = Math.abs(offset);
      const offsetHours = pad(Math.floor(absOffset / 60));
      const offsetMinutes = pad(absOffset % 60);
      const isoWithOffset = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}:${pad(localDate.getSeconds())}${sign}${offsetHours}:${offsetMinutes}`;
      timeEntered = isoWithOffset;
    }
    try {
      // Ensure pair is trimmed and not empty
      const trimmedPair = creationForm.pair ? creationForm.pair.trim() : "";
      if (!trimmedPair) {
        alert("Pair is required and cannot be empty or whitespace.");
        setLoading(false);
        return;
      }
      if (editingId) {
        // Only send before fields if editing before fields
        const payload = {
          type: creationForm.type,
          pair: trimmedPair,
          strategy: creationForm.strategy,
          emotions: creationForm.emotions,
          confluences: creationForm.confluences,
          beforeScreenshot: await buildMediaField("beforeScreenshot", "image"),
          beforeScreenRecording: await buildMediaField("beforeScreenRecording", "video"),
          timeEntered,
        };
        console.log('Submitting updateJournalEntry payload:', payload);
        await updateJournalEntry(editingId, payload);
      } else {
        // Only send before fields on creation
        const payload = {
          type: creationForm.type,
          pair: trimmedPair,
          strategy: creationForm.strategy,
          emotions: creationForm.emotions,
          confluences: creationForm.confluences,
          beforeScreenshot: await buildMediaField("beforeScreenshot", "image"),
          beforeScreenRecording: await buildMediaField("beforeScreenRecording", "video"),
          timeEntered,
        };
        console.log('Submitting postJournalEntry payload:', payload);
        await postJournalEntry(payload);
      }
      setShowCreationModal(false);
      setEditingId(null);
      setEditingEntry(null);
      setCreationForm({
        type: "Buy",
        pair: "",
        strategy: "",
        emotions: "",
        confluences: "",
        beforeScreenshot: null,
        beforeScreenRecording: null,
        timeEntered: ""
      });
      getJournalEntries(page, 4).then(({ entries, total }) => {
        setEntries(entries);
        setTotalPages(Math.ceil(total / 4));
      });
    } catch (error) {
      if (error.response) {
        console.error('Server responded with error:', error.response.status, error.response.data);
      } else {
        console.error('Error submitting journal entry:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle after edit form submit (update after fields only)
  const handleAfterEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const buildMediaField = async (field, type) => {
      if (afterForm[field] instanceof File) {
        return await uploadToCloudinary(afterForm[field], type);
      } else if (afterForm[field] && afterForm[field].url) {
        return afterForm[field];
      } else {
        return null;
      }
    };
    let timeAfterPlayout = (() => {
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, '0');
      const localDatetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      return localDatetime;
    })();
    if (timeAfterPlayout) {
      const localDate = new Date(timeAfterPlayout);
      const pad = (n) => n.toString().padStart(2, '0');
      const offset = -localDate.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const absOffset = Math.abs(offset);
      const offsetHours = pad(Math.floor(absOffset / 60));
      const offsetMinutes = pad(absOffset % 60);
      const isoWithOffset = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}T${pad(localDate.getHours())}:${pad(localDate.getMinutes())}:${pad(localDate.getSeconds())}${sign}${offsetHours}:${offsetMinutes}`;
      timeAfterPlayout = isoWithOffset;
    }
    try {
      // Only send after fields on after edit
      const payload = {
        outcome: afterForm.outcome,
        afterScreenshot: await buildMediaField("afterScreenshot", "image"),
        afterScreenRecording: await buildMediaField("afterScreenRecording", "video"),
        timeAfterPlayout,
      };
      if (editingId) {
        await updateJournalEntry(editingId, payload);
      }
      setShowAfterEditModal(false);
      setEditingId(null);
      setAfterForm({
        outcome: "",
        afterScreenshot: null,
        afterScreenRecording: null,
        timeAfterPlayout: ""
      });
      getJournalEntries(page, 4).then(({ entries, total }) => {
        setEntries(entries);
        setTotalPages(Math.ceil(total / 4));
      });
    } catch (error) {
      if (error.response) {
        console.error('Server responded with error:', error.response.status, error.response.data);
      } else {
        console.error('Error updating after journal entry:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle creation form field changes
  const handleCreationChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      setCreationForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setCreationForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle after edit form field changes
  const handleAfterEditChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      setAfterForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setAfterForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // --- JSX Render ---

  return (
    <div className="w-full">
      <JournalPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPay={handlePay}
        loading={paymentLoading}
        error={paymentError}
      />
      <div className="max-w-3xl mx-auto p-2 sm:p-4 sm:max-w-full sm:mx-0">
        <div className="mb-6">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 sm:mb-0">Your Journal Entries</h2>
            <div className="flex flex-row gap-2 w-full sm:w-auto sm:justify-end">
              <button
                onClick={handleNewEntry}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition shadow w-fit sm:w-auto sm:text-left"
              >
                + New Entry
              </button>
              <button
                onClick={() => navigate('/dashboard/markets')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition shadow w-fit sm:w-auto sm:text-left"
                type="button"
              >
                View Markets
              </button>
            </div>
            <JournalBeforeModal
              open={showCreationModal && !editingId}
              onClose={() => { setShowCreationModal(false); setEditingId(null); setEditingEntry(null); }}
              form={creationForm}
              onChange={handleCreationChange}
              onSubmit={handleCreationSubmit}
              loading={loading}
              editing={Boolean(editingId)}
              noScroll
            />
            <JournalAfterModal
              open={showAfterEditModal}
              onClose={() => { setShowAfterEditModal(false); setEditingId(null); setEditingEntry(null); }}
              form={afterForm}
              onChange={handleAfterEditChange}
              onSubmit={handleAfterEditSubmit}
              loading={loading}
              editing={Boolean(editingId)}
            />
          </div>
          {/* Zoom Modal for media */}
          {zoomMedia && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setZoomMedia(null)}>
              <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 max-w-2xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl font-bold" onClick={() => setZoomMedia(null)}>×</button>
                <div className="mb-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-200">{zoomMedia.label}</div>
                {zoomMedia.type === 'image' ? (
                  <img src={zoomMedia.url} alt={zoomMedia.label} className="max-h-[70vh] w-auto rounded shadow" />
                ) : (
                  <video src={zoomMedia.url} controls className="max-h-[70vh] w-auto rounded shadow" />
                )}
              </div>
            </div>
          )}
          <div className="space-y-6">
            {loading ? (
              <p className="text-gray-700 dark:text-gray-200">Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-gray-700 dark:text-gray-200">No journal entries yet.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {entries.map((entry) => {
                    const today = new Date();
                    const entryDate = entry.date ? new Date(entry.date) : null;
                    const afterDate = entry.timeAfterPlayout ? new Date(entry.timeAfterPlayout) : null;
                    const isSameDay = (d1, d2) =>
                      d1 && d2 &&
                      d1.getFullYear() === d2.getFullYear() &&
                      d1.getMonth() === d2.getMonth() &&
                      d1.getDate() === d2.getDate();
                    const canEditBefore = entryDate && isSameDay(today, entryDate);
                    const canEditAfter = afterDate && isSameDay(today, afterDate);
                    const isEditing = editingId === entry._id && showCreationModal === false;
                    return (
                      <div
                        key={entry._id}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {entry.pair && (
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{entry.pair}</span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              entry.type === "Buy"
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                            }`}>
                              {entry.type}
                            </span>
                            {entry.outcome && (
                              <span className="ml-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                                Outcome:
                                <span className={`ml-1 px-2 py-1 rounded text-xs font-bold ${
                                  entry.outcome === "Profit"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                                }`}>
                                  {entry.outcome}
                                </span>
                              </span>
                            )}
                          </div>
                          <button
                            className="ml-2 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
                            onClick={() => {
                              const now = new Date();
                              const pad = (n) => n.toString().padStart(2, '0');
                              const localDatetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                              setEditingId(entry._id);
                              setEditingEntry(entry);
                              setAfterForm((prev) => ({
                                outcome: entry.outcome || "",
                                afterScreenshot: prev.afterScreenshot !== null && prev.afterScreenshot !== undefined ? prev.afterScreenshot : (entry.afterScreenshot || null),
                                afterScreenRecording: prev.afterScreenRecording !== null && prev.afterScreenRecording !== undefined ? prev.afterScreenRecording : (entry.afterScreenRecording || null),
                                timeAfterPlayout: localDatetime
                              }));
                              setShowAfterEditModal(true);
                            }}
                            type="button"
                          >
                            Add After
                          </button>
                        </div>
                        {/* Inline edit form for 'before' fields */}
                        {isEditing ? (
                          <form
                            className="space-y-2"
                            onSubmit={handleCreationSubmit}
                          >
                            <div>
                              <label className="block text-xs font-semibold mb-1">Type</label>
                              <select
                                name="type"
                                value={creationForm.type}
                                onChange={handleCreationChange}
                                className="w-full rounded border px-2 py-1"
                              >
                                <option value="Buy">Buy</option>
                                <option value="Sell">Sell</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Pair</label>
                              <input
                                type="text"
                                name="pair"
                                value={creationForm.pair}
                                onChange={handleCreationChange}
                                className="w-full rounded border px-2 py-1"
                                placeholder="e.g. EURUSD"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Strategy</label>
                              <textarea
                                name="strategy"
                                value={creationForm.strategy}
                                onChange={handleCreationChange}
                                className="w-full rounded border px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Emotions</label>
                              <textarea
                                name="emotions"
                                value={creationForm.emotions}
                                onChange={handleCreationChange}
                                className="w-full rounded border px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Confluences</label>
                              <textarea
                                name="confluences"
                                value={creationForm.confluences}
                                onChange={handleCreationChange}
                                className="w-full rounded border px-2 py-1"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Before Screenshot</label>
                              <input
                                type="file"
                                name="beforeScreenshot"
                                accept="image/*"
                                onChange={handleCreationChange}
                                className="w-full"
                              />
                              {creationForm.beforeScreenshot && creationForm.beforeScreenshot.url && (
                                <img src={creationForm.beforeScreenshot.url} alt="Before Screenshot" className="h-16 w-16 object-cover rounded border shadow mt-1" />
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Before Screen Recording</label>
                              <input
                                type="file"
                                name="beforeScreenRecording"
                                accept="video/*"
                                onChange={handleCreationChange}
                                className="w-full"
                              />
                              {creationForm.beforeScreenRecording && creationForm.beforeScreenRecording.url && (
                                <video src={creationForm.beforeScreenRecording.url} className="h-16 w-16 object-cover rounded border shadow mt-1" controls />
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1">Time Entered</label>
                              <input
                                type="datetime-local"
                                name="timeEntered"
                                value={creationForm.timeEntered}
                                onChange={handleCreationChange}
                                className="w-full rounded border px-2 py-1"
                                min={(function () {
                                  const now = new Date();
                                  const pad = n => n.toString().padStart(2, '0');
                                  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00`;
                                })()}
                                max={(function () {
                                  const now = new Date();
                                  const pad = n => n.toString().padStart(2, '0');
                                  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
                                })()}
                              />
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-4 rounded"
                                disabled={loading}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-1 px-4 rounded"
                                onClick={() => { setEditingId(null); setEditingEntry(null); }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500 mb-1">
                              {entry.timeEntered && (
                                <span>
                                  ⏱️ <span className="font-semibold">Entered:</span> {(() => {
                                    const d = new Date(entry.timeEntered);
                                    return d.toLocaleString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false
                                    });
                                  })()}
                                </span>
                              )}
                              {entry.timeAfterPlayout && (
                                <span className="sm:ml-4">
                                  ⏲️ <span className="font-semibold">Updated:</span> {(() => {
                                    const d = new Date(entry.timeAfterPlayout);
                                    return d.toLocaleString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false
                                    });
                                  })()} <span className="font-normal">(After)</span>
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-semibold text-gray-800 dark:text-gray-100">Strategy:</span>
                              <div className="text-gray-700 dark:text-gray-200 whitespace-pre-line">{entry.strategy}</div>
                            </div>
                            <div>
                              <span className="font-semibold text-gray-800 dark:text-gray-100">Emotions & Confluences:</span>
                              <div className="text-gray-700 dark:text-gray-200 whitespace-pre-line">{entry.emotions}</div>
                            </div>
                            {entry.confluences && (
                              <div>
                                <span className="font-semibold text-gray-800 dark:text-gray-100">Confluences:</span>
                                <div className="text-gray-700 dark:text-gray-200 whitespace-pre-line">{entry.confluences}</div>
                              </div>
                            )}
                            <div className="flex gap-2 mt-2 items-center">
                              {entry.beforeScreenshot && entry.beforeScreenshot.url && (
                                <div className="flex flex-col items-center cursor-pointer" onClick={() => setZoomMedia({ url: entry.beforeScreenshot.url, type: 'image', label: 'Screenshot (Before Trade)' })}>
                                  <img src={entry.beforeScreenshot.url} alt="Before Screenshot" className="h-16 w-16 object-cover rounded border shadow" />
                                  <span className="text-xs mt-1 text-gray-600 dark:text-gray-300">Before</span>
                                </div>
                              )}
                              {entry.afterScreenshot && entry.afterScreenshot.url && (
                                <div className="flex flex-col items-center cursor-pointer" onClick={() => setZoomMedia({ url: entry.afterScreenshot.url, type: 'image', label: 'Screenshot (After Trade)' })}>
                                  <img src={entry.afterScreenshot.url} alt="After Screenshot" className="h-16 w-16 object-cover rounded border shadow" />
                                  <span className="text-xs mt-1 text-gray-600 dark:text-gray-300">After</span>
                                </div>
                              )}
                              {entry.afterScreenRecording && entry.afterScreenRecording.url && (
                                <div className="flex flex-col items-center cursor-pointer" onClick={() => setZoomMedia({ url: entry.afterScreenRecording.url, type: 'video', label: 'Screen Recording (After Trade)' })}>
                                  <video src={entry.afterScreenRecording.url} className="h-16 w-16 object-cover rounded border shadow" />
                                  <span className="text-xs mt-1 text-gray-600 dark:text-gray-300">After</span>
                                </div>
                              )}
                              {entry.beforeScreenRecording && entry.beforeScreenRecording.url && (
                                <div className="flex flex-col items-center cursor-pointer" onClick={() => setZoomMedia({ url: entry.beforeScreenRecording.url, type: 'video', label: 'Screen Recording (Before Trade)' })}>
                                  <video src={entry.beforeScreenRecording.url} className="h-16 w-16 object-cover rounded border shadow" />
                                  <span className="text-xs mt-1 text-gray-600 dark:text-gray-300">Before</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Pagination controls */}
                <div className="flex justify-center mt-6 gap-2">
                  <button
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold disabled:opacity-50"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <span className="px-2 py-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold disabled:opacity-50"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Journal;
