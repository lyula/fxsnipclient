import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import JournalMarkets from "./JournalMarkets";
import {
  getJournalEntries,
  postJournalEntry,
  deleteJournalEntry,
  updateJournalEntry
} from '../../utils/journalApi';
import { uploadToCloudinary } from '../../utils/cloudinaryUpload';

function Journal() {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  useEffect(() => {
    setLoading(true);
    getJournalEntries(page, 4)
      .then(({ entries, total }) => {
        setEntries(entries);
        setTotalPages(Math.ceil(total / 4));
      })
      .finally(() => setLoading(false));
  }, [page]);
  const [entries, setEntries] = useState([]);
  const [zoomMedia, setZoomMedia] = useState(null); // { url, type, label }
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "Buy",
    strategy: "",
    emotions: "",
    confluences: "",
    beforeScreenshot: null,
    afterScreenshot: null,
    beforeScreenRecording: null,
    afterScreenRecording: null,
    outcome: "",
    timeEntered: "",
    timeAfterPlayout: ""
  });
  const [editingId, setEditingId] = useState(null); // Track if editing
  const navigate = useNavigate();
  // ...existing code for hooks, handlers, loading, page, pageSize, totalPages, setPage, setTotalPages, handleSubmit, handleChange, etc...

  // Populate form for editing
  const handleEdit = (entry) => {
    setForm({
      type: entry.type || "Buy",
      strategy: entry.strategy || "",
      emotions: entry.emotions || "",
      confluences: entry.confluences || "",
      beforeScreenshot: entry.beforeScreenshot || null,
      afterScreenshot: entry.afterScreenshot || null,
      beforeScreenRecording: entry.beforeScreenRecording || null,
      afterScreenRecording: entry.afterScreenRecording || null,
      outcome: entry.outcome || "",
      timeEntered: entry.timeEntered || "",
      timeAfterPlayout: entry.timeAfterPlayout || ""
    });
    setEditingId(entry._id);
    setShowForm(true);
  };

  // Open modal for new entry and clear form
  const handleNewEntry = () => {
    setForm({
      type: "Buy",
      strategy: "",
      emotions: "",
      confluences: "",
      beforeScreenshot: null,
      afterScreenshot: null,
      beforeScreenRecording: null,
      afterScreenRecording: null,
      outcome: "",
      timeEntered: "",
      timeAfterPlayout: ""
    });
    setEditingId(null);
    setShowForm(true);
  };

  // Handle form submit for add/update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Build payload, only upload new files, keep existing URLs
    const buildMediaField = async (field, type) => {
      if (form[field] instanceof File) {
        // New file selected, upload
        return await uploadToCloudinary(form[field], type);
      } else if (form[field] && form[field].url) {
        // Existing media object, keep as-is
        return form[field];
      } else {
        // No media
        return null;
      }
    };
    const payload = {
      ...form,
      beforeScreenshot: await buildMediaField("beforeScreenshot", "image"),
      afterScreenshot: await buildMediaField("afterScreenshot", "image"),
      beforeScreenRecording: await buildMediaField("beforeScreenRecording", "video"),
      afterScreenRecording: await buildMediaField("afterScreenRecording", "video"),
    };
    if (editingId) {
      await updateJournalEntry(editingId, payload);
    } else {
      await postJournalEntry(payload);
    }
    setShowForm(false);
    setEditingId(null);
    setForm({
      type: "Buy",
      strategy: "",
      emotions: "",
      confluences: "",
      beforeScreenshot: null,
      afterScreenshot: null,
      beforeScreenRecording: null,
      afterScreenRecording: null,
      outcome: "",
      timeEntered: "",
      timeAfterPlayout: ""
    });
    // Refresh entries
    getJournalEntries(page, 4).then(({ entries, total }) => {
      setEntries(entries);
      setTotalPages(Math.ceil(total / 4));
    });
    setLoading(false);
  };

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="w-full">
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
          </div>
        </div>

        {/* Modal for Journal Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-2 relative animate-fadeIn hide-scrollbar"
              style={{
                maxHeight: 'calc(100vh - 2.5rem)',
                marginTop: '1.25rem',
                marginBottom: '1.25rem',
                overflowY: 'auto',
                padding: '1rem',
                boxSizing: 'border-box',
              }}
            >
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl font-bold"
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100">{editingId ? "Update Journal Entry" : "New Journal Entry"}</h2>
              <form className="space-y-3 text-sm" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                  >
                    <option value="Buy">Buy</option>
                    <option value="Sell">Sell</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Strategy</label>
                  <textarea
                    name="strategy"
                    value={form.strategy}
                    onChange={handleChange}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Emotions</label>
                  <textarea
                    name="emotions"
                    value={form.emotions}
                    onChange={handleChange}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Confluences</label>
                  <textarea
                    name="confluences"
                    value={form.confluences}
                    onChange={handleChange}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Outcome</label>
                  <select
                    name="outcome"
                    value={form.outcome}
                    onChange={handleChange}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                  >
                    <option value="">Select Outcome</option>
                    <option value="Profit">Profit</option>
                    <option value="Loss">Loss</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Time Entered</label>
                  <input
                    name="timeEntered"
                    type="datetime-local"
                    value={form.timeEntered}
                    onChange={handleChange}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Time After Playout</label>
                  <input
                    name="timeAfterPlayout"
                    type="datetime-local"
                    value={form.timeAfterPlayout}
                    onChange={handleChange}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Screen Recording (Before Trade)</label>
                    <input
                      id="beforeScreenRecording"
                      name="beforeScreenRecording"
                      type="file"
                      accept="video/*"
                      onChange={handleChange}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Screen Recording (After Trade)</label>
                    <input
                      id="afterScreenRecording"
                      name="afterScreenRecording"
                      type="file"
                      accept="video/*"
                      onChange={handleChange}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Screenshot (Before Trade)</label>
                    <input
                      id="beforeScreenshot"
                      name="beforeScreenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleChange}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100">Screenshot (After Trade)</label>
                    <input
                      id="afterScreenshot"
                      name="afterScreenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleChange}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 rounded transition text-sm"
                >
                  {editingId ? "Update Journal Entry" : "Add Journal Entry"}
                </button>
              </form>
            </div>
          </div>
        )}

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
                {entries.map((entry) => (
                  <div
                    key={entry._id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        entry.type === "Buy"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {entry.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        entry.outcome === "Profit"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}>
                        {entry.outcome}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500 mb-1">
                      <span>{new Date(entry.date).toLocaleString()}</span>
                      {entry.timeEntered && (
                        <span className="sm:ml-4">⏱️ <span className="font-semibold">Entered:</span> {entry.timeEntered.replace('T', ' ')}</span>
                      )}
                      {entry.timeAfterPlayout && (
                        <span className="sm:ml-4">⏲️ <span className="font-semibold">After Playout:</span> {entry.timeAfterPlayout.replace('T', ' ')}</span>
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
                      {entry.beforeScreenRecording && entry.beforeScreenRecording.url && (
                        <div className="flex flex-col items-center cursor-pointer" onClick={() => setZoomMedia({ url: entry.beforeScreenRecording.url, type: 'video', label: 'Screen Recording (Before Trade)' })}>
                          <video src={entry.beforeScreenRecording.url} className="h-16 w-16 object-cover rounded border shadow" />
                          <span className="text-xs mt-1 text-gray-600 dark:text-gray-300">Before</span>
                        </div>
                      )}
                      {entry.afterScreenRecording && entry.afterScreenRecording.url && (
                        <div className="flex flex-col items-center cursor-pointer" onClick={() => setZoomMedia({ url: entry.afterScreenRecording.url, type: 'video', label: 'Screen Recording (After Trade)' })}>
                          <video src={entry.afterScreenRecording.url} className="h-16 w-16 object-cover rounded border shadow" />
                          <span className="text-xs mt-1 text-gray-600 dark:text-gray-300">After</span>
                        </div>
                      )}
                    </div>
                    {entry.beforeScreenRecording && entry.beforeScreenRecording.url && (
                      <div className="mt-2">
                        <span className="block text-xs font-semibold mb-1">Screen Recording (Before Trade):</span>
                        <video
                          controls
                          className="w-full rounded border"
                          style={{ maxHeight: 180 }}
                          src={entry.beforeScreenRecording.url}
                        />
                      </div>
                    )}
                    {entry.afterScreenRecording && entry.afterScreenRecording.url && (
                      <div className="mt-2">
                        <span className="block text-xs font-semibold mb-1">Screen Recording (After Trade):</span>
                        <video
                          controls
                          className="w-full rounded border"
                          style={{ maxHeight: 180 }}
                          src={entry.afterScreenRecording.url}
                        />
                      </div>
                    )}
                    <div className="flex gap-2 mt-2 self-end">
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => handleEdit(entry)}
                        type="button"
                      >Edit</button>
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={async () => {
                          setLoading(true);
                          await deleteJournalEntry(entry._id);
                          getJournalEntries(page, 4).then(({ entries, total }) => {
                            setEntries(entries);
                            setTotalPages(Math.ceil(total / 4));
                          });
                          setLoading(false);
                        }}
                        type="button"
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-gray-700 dark:text-gray-200">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Journal;