import { useEffect, useState } from "react";

export default function Notifications() {
  // Replace with real API call later
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Jane Trader followed you.", time: "2m ago", read: false },
    { id: 2, text: "Your post received a new comment.", time: "10m ago", read: true },
    { id: 3, text: "You have a new follower.", time: "1h ago", read: false },
    // ...more
  ]);

  useEffect(() => {
    // Fetch notifications from API here in the future
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-[calc(100vh-0px)] bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow p-0">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-30">
        <h2 className="font-bold text-xl text-[#1E3A8A] dark:text-[#a99d6b]">Notifications</h2>
      </div>
      {/* Only this div is scrollable */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 text-lg">
            No notifications yet.
          </div>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 ${
                  n.read ? "bg-white dark:bg-gray-800" : "bg-blue-50 dark:bg-gray-900"
                }`}
              >
                <span className="flex-1 text-gray-900 dark:text-white">{n.text}</span>
                <span className="text-xs text-gray-400">{n.time}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}