import React from "react";
import ModalPortal from "./ModalPortal";

const JournalBeforeModal = ({ open, onClose, form, onChange, onSubmit, loading, editing, noScroll }) => {
  if (!open) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
        <div
          className="relative flex flex-col w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-3 py-4 sm:px-8 sm:py-8"
          style={{
            minHeight: '320px',
            maxHeight: '95vh',
            ...(typeof window !== 'undefined' && window.innerWidth >= 640 ? { minHeight: '540px', maxHeight: '98vh' } : {}),
            overflowY: noScroll ? 'visible' : 'auto',
            boxSizing: 'border-box',
            margin: '0 1rem',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
            onClick={onClose}
            aria-label="Close"
            type="button"
            tabIndex={0}
          >
            ×
          </button>
          <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center tracking-tight">{editing ? 'Edit Entry (Before Trade)' : 'New Journal Entry'}</h3>
          {/* Only one modal header and close button should exist. Remove duplicate. */}
          <form onSubmit={onSubmit} className="flex flex-col gap-4 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={onChange}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-base sm:text-base min-h-[32px] sm:min-h-[36px] focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  required
                >
                  <option value="Buy">Buy</option>
                  <option value="Sell">Sell</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Time Entered</label>
                <input
                  type="datetime-local"
                  name="timeEntered"
                  value={form.timeEntered}
                  onChange={onChange}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-base sm:text-base min-h-[32px] sm:min-h-[36px] focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 w-full">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Strategy</label>
                <textarea
                  name="strategy"
                  value={form.strategy}
                  onChange={onChange}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-base sm:text-base min-h-[36px] sm:min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Emotions</label>
                <textarea
                  name="emotions"
                  value={form.emotions}
                  onChange={onChange}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-base sm:text-base min-h-[36px] sm:min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Confluences</label>
                <textarea
                  name="confluences"
                  value={form.confluences}
                  onChange={onChange}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-base sm:text-base min-h-[36px] sm:min-h-[44px] focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Before Screenshot</label>
                <input
                  type="file"
                  name="beforeScreenshot"
                  accept="image/*"
                  onChange={onChange}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
                {form.beforeScreenshot && form.beforeScreenshot.url && (
                  <img src={form.beforeScreenshot.url} alt="Before Screenshot" className="h-24 w-24 object-cover rounded border shadow mt-1" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-200">Before Screen Recording</label>
                <input
                  type="file"
                  name="beforeScreenRecording"
                  accept="video/*"
                  onChange={onChange}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
                {form.beforeScreenRecording && form.beforeScreenRecording.url && (
                  <video src={form.beforeScreenRecording.url} className="h-24 w-24 object-cover rounded border shadow mt-1" controls />
                )}
              </div>
            </div>
            <div className="flex flex-row gap-2 mt-2 justify-center">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 sm:px-8 sm:py-3 rounded text-sm sm:text-lg min-w-[90px] sm:min-w-[120px] whitespace-nowrap"
                disabled={loading}
                style={{lineHeight: 1.2}}
              >
                {loading ? 'Saving...' : (editing ? 'Save Changes' : 'Create Entry')}
              </button>
              <button
                type="button"
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-4 py-2 sm:px-8 sm:py-3 rounded text-sm sm:text-lg min-w-[90px] sm:min-w-[120px] whitespace-nowrap"
                onClick={onClose}
                style={{lineHeight: 1.2}}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default JournalBeforeModal;
