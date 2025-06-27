import { useEffect, useState } from "react";
import { getNotifications, markNotificationsRead } from "../../utils/api";
import VerifiedBadge from "../../components/VerifiedBadge";

// Helper to show "just now", "10 mins ago", etc.
function timeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000); // seconds
  if (diff < 120) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

const NotificationItem = ({ message, time }) => {
  return (
    <div className="notification-item flex justify-between items-center p-4 border-b">
      <span className="message">{message}</span>
      <span className="time text-gray-500 text-sm">{time}</span>
    </div>
  );
};

const Notifications = ({ notifications }) => {
  return (
    <div className="notifications-container">
      {notifications.map((notification, index) => (
        <NotificationItem
          key={index}
          message={notification.message}
          time={notification.time}
        />
      ))}
    </div>
  );
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Fetch notifications from API
    getNotifications().then(setNotifications);
    // Mark all as read
    markNotificationsRead();
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-[calc(100vh-0px)] bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow p-0">
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-30">
        <h2 className="font-bold text-xl text-[#1E3A8A] dark:text-[#a99d6b]">
          Notifications
        </h2>
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
                key={n._id}
                className={`px-4 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 ${
                  n.read
                    ? "bg-white dark:bg-gray-800"
                    : "bg-blue-50 dark:bg-gray-900"
                }`}
              >
                <span className="flex items-center gap-2 text-gray-900 dark:text-white flex-1">
                  {n.type === "follow" && n.from ? (
                    <>
                      <span
                        className="font-semibold"
                        style={{ color: "#a99d6b", cursor: "pointer" }}
                        onClick={() =>
                          (window.location.href = `/dashboard/community/user/${encodeURIComponent(
                            n.from.username
                          )}`)
                        }
                        title={`View ${n.from.username}'s profile`}
                      >
                        {n.from.username}
                      </span>
                      {n.from.verified && <VerifiedBadge />}
                      {" followed you "}
                    </>
                  ) : (
                    <>{n.text}</>
                  )}
                </span>
                <span className="text-xs text-gray-400">
                  {timeAgo(n.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}