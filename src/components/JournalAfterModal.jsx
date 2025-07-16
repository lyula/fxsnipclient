import React from "react";
import ModalPortal from "./ModalPortal";

const JournalAfterModal = ({ open, onClose, form, onChange, onSubmit, loading, editing }) => {
  if (!open) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
        <div
          className="relative flex flex-col w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-4 py-6 sm:px-8 sm:py-8"
          style={{
            minHeight: '420px',
            maxHeight: '95vh',
            overflowY: 'auto',
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
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center tracking-tight">{editing ? 'Edit Entry (After Trade)' : 'Update After Fields'}</h3>
          <form className="flex flex-col gap-5" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">Outcome</label>
                <select
                  name="outcome"
                  value={form.outcome}
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                >
                  <option value="">Select</option>
                  <option value="Profit">Profit</option>
                  <option value="Loss">Loss</option>
                  <option value="Break Even">Break Even</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">Time After Playout</label>
                <input
                  name="timeAfterPlayout"
                  type="datetime-local"
                  value={form.timeAfterPlayout}
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">Screen Recording (After Trade)</label>
                <input
                  id="afterScreenRecording"
                  name="afterScreenRecording"
                  type="file"
                  accept="video/*"
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">Screenshot (After Trade)</label>
                <input
                  id="afterScreenshot"
                  name="afterScreenshot"
                  type="file"
                  accept="image/*"
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 py-2 px-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition text-base shadow-sm mt-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={loading}
            >
              {editing ? "Update After Fields" : "Save After Fields"}
            </button>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default JournalAfterModal;
