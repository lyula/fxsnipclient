import { useState } from "react";

const dummyEntries = [
  {
    id: 1,
    type: "Buy",
    strategy: "Breakout from resistance",
    emotions: "Confident, saw strong confluence with news",
    confluences: "Support zone, bullish engulfing, high volume",
    beforeScreenshot: null,
    afterScreenshot: null,
    video: null,
    outcome: "Profit",
    date: "2025-07-15 10:30",
  },
  // ...more dummy entries
];

function Journal() {
  const [entries, setEntries] = useState(dummyEntries);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "Buy",
    strategy: "",
    emotions: "",
    confluences: "",
    beforeScreenshot: null,
    afterScreenshot: null,
    beforeScreenRecording: null,
    afterScreenRecording: null,
    outcome: "Profit",
    timeEntered: "",
    timeAfterPlayout: "",
  });
  // Pagination state
  const [page, setPage] = useState(1);
  const pageSize = 4;
  const totalPages = Math.ceil(entries.length / pageSize);
  const paginatedEntries = entries.slice((page - 1) * pageSize, page * pageSize);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setForm((f) => ({ ...f, [name]: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setEntries([
      {
        ...form,
        id: Date.now(),
        date: new Date().toLocaleString(),
      },
      ...entries,
    ]);
    setForm({
      type: "Buy",
      strategy: "",
      emotions: "",
      confluences: "",
      beforeScreenshot: null,
      afterScreenshot: null,
      beforeScreenRecording: null,
      afterScreenRecording: null,
      outcome: "Profit",
      timeEntered: "",
      timeAfterPlayout: "",
    });
    setShowForm(false);
    // Reset file inputs manually if needed
    setTimeout(() => {
      if (document.getElementById("beforeScreenshot")) document.getElementById("beforeScreenshot").value = "";
      if (document.getElementById("afterScreenshot")) document.getElementById("afterScreenshot").value = "";
      if (document.getElementById("beforeScreenRecording")) document.getElementById("beforeScreenRecording").value = "";
      if (document.getElementById("afterScreenRecording")) document.getElementById("afterScreenRecording").value = "";
    }, 100);
  };

  return (
    <div className="w-full">
      <div className="max-w-3xl mx-auto p-2 sm:p-4 sm:max-w-full sm:mx-0">
        <div className="mb-6">
          <div className="hidden sm:flex sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-0">Your Journal Entries</h2>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition shadow sm:w-auto mt-2 sm:mt-0"
            >
              + New Journal Entry
            </button>
          </div>
        </div>

        {/* Modal for Journal Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md mx-2 relative animate-fadeIn hide-scrollbar"
              style={{
                maxHeight: 'calc(100vh - 5rem)',
                marginTop: '2.5rem',
                marginBottom: '2.5rem',
                overflowY: 'auto',
                padding: '1rem',
                boxSizing: 'border-box',
              }}
            >
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl font-bold"
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-gray-100">New Journal Entry</h2>
              <form className="space-y-3 text-sm" onSubmit={handleSubmit}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Trade Type</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={handleChange}
                        className="w-full rounded border-gray-300 dark:bg-gray-700 dark:text-gray-100 text-sm px-2 py-1"
                    >
                      <option value="Buy">Buy</option>
                      <option value="Sell">Sell</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Outcome</label>
                    <select
                      name="outcome"
                      value={form.outcome}
                      onChange={handleChange}
                        className="w-full rounded border-gray-300 dark:bg-gray-700 dark:text-gray-100 text-sm px-2 py-1"
                    >
                      <option value="Profit">Profit</option>
                      <option value="Loss">Loss</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Strategy</label>
                  <textarea
                    name="strategy"
                    value={form.strategy}
                    onChange={handleChange}
                    rows={2}
                      className="w-full rounded border-gray-300 dark:bg-gray-700 dark:text-gray-100 text-sm"
                    placeholder="Specify the strategy for this trade..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Emotions</label>
                  <textarea
                    name="emotions"
                    value={form.emotions}
                    onChange={handleChange}
                    rows={2}
                      className="w-full rounded border-gray-300 dark:bg-gray-700 dark:text-gray-100 text-sm"
                    placeholder="How do you/did you feel when placing this trade?"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Confluences</label>
                  <textarea
                    name="confluences"
                    value={form.confluences}
                    onChange={handleChange}
                    rows={2}
                      className="w-full rounded border-gray-300 dark:bg-gray-700 dark:text-gray-100 text-sm"
                    placeholder="List your confluences..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Screen Recording (Before Trade)</label>
                    <input
                      id="beforeScreenRecording"
                      name="beforeScreenRecording"
                      type="file"
                      accept="video/*"
                      onChange={handleChange}
                        className="w-full text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Screen Recording (After Trade)</label>
                    <input
                      id="afterScreenRecording"
                      name="afterScreenRecording"
                      type="file"
                      accept="video/*"
                      onChange={handleChange}
                        className="w-full text-xs"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Screenshot (Before Trade)</label>
                    <input
                      id="beforeScreenshot"
                      name="beforeScreenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleChange}
                        className="w-full text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Screenshot (After Trade)</label>
                    <input
                      id="afterScreenshot"
                      name="afterScreenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleChange}
                        className="w-full text-xs"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 rounded transition text-sm"
                >
                  Add Journal Entry
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* On mobile, show the title and button stacked */}
          <div className="block sm:hidden mb-2">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Your Journal Entries</h2>
          </div>
          {/* On mobile, show the button below the title */}
          <div className="block sm:hidden mb-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition shadow min-w-[140px]"
              style={{ width: 'fit-content' }}
            >
              + New Journal Entry
            </button>
          </div>
          {entries.length === 0 ? (
            <p className="text-gray-700 dark:text-gray-200">No journal entries yet.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {paginatedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col gap-2"
                  >
                    {/* ...existing code... */}
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
                    {/* ...existing code... */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-gray-500 mb-1">
                      <span>{entry.date}</span>
                      {entry.timeEntered && (
                        <span className="sm:ml-4">⏱️ <span className="font-semibold">Entered:</span> {entry.timeEntered.replace('T', ' ')}</span>
                      )}
                      {entry.timeAfterPlayout && (
                        <span className="sm:ml-4">⏲️ <span className="font-semibold">After Playout:</span> {entry.timeAfterPlayout.replace('T', ' ')}</span>
                      )}
                    </div>
                    {/* ...existing code... */}
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
                      {/* Media icons */}
                      {entry.beforeScreenshot && (
                        <span title="Before Screenshot" className="text-xl">🖼️</span>
                      )}
                      {entry.afterScreenshot && (
                        <span title="After Screenshot" className="text-xl">🖼️</span>
                      )}
                      {entry.beforeScreenRecording && (
                        <span title="Before Screen Recording" className="text-xl">🎬</span>
                      )}
                      {entry.afterScreenRecording && (
                        <span title="After Screen Recording" className="text-xl">🎬</span>
                      )}
                    </div>
                    {entry.beforeScreenRecording && (
                      <div className="mt-2">
                        <span className="block text-xs font-semibold mb-1">Screen Recording (Before Trade):</span>
                        <video
                          controls
                          className="w-full rounded border"
                          style={{ maxHeight: 180 }}
                        >
                          <source src={URL.createObjectURL(entry.beforeScreenRecording)} />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                    {entry.afterScreenRecording && (
                      <div className="mt-2">
                        <span className="block text-xs font-semibold mb-1">Screen Recording (After Trade):</span>
                        <video
                          controls
                          className="w-full rounded border"
                          style={{ maxHeight: 180 }}
                        >
                          <source src={URL.createObjectURL(entry.afterScreenRecording)} />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold disabled:opacity-50"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`px-3 py-1 rounded font-semibold ${
                        page === i + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
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