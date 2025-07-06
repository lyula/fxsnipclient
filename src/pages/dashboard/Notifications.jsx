import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { markNotificationsRead } from "../../utils/api";
import VerifiedBadge from "../../components/VerifiedBadge";
import { Link } from "react-router-dom";
import { useDashboard } from "../../context/dashboard";

export default function NotificationsPage() {
  const navigate = useNavigate();
  
  const {
    notifications,
    fetchNotifications,
    loadingStates,
    setNotifications,
    formatRelativeTime,
  } = useDashboard();

  const [localLoading, setLocalLoading] = useState(false);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark all as read when component mounts
  useEffect(() => {
    const markAsRead = async () => {
      if (notifications.length > 0) {
        setLocalLoading(true);
        try {
          await markNotificationsRead();
          // Optimistically mark all as read
          setNotifications((prev) =>
            prev.map((n) => ({ ...n, read: true }))
          );
        } catch (error) {
          console.error("Error marking notifications as read:", error);
        }
        setLocalLoading(false);
      }
    };

    markAsRead();
  }, [notifications.length, setNotifications]);

  // Show cached data immediately with background refresh indicator
  const showLoading = loadingStates.notifications && notifications.length === 0;

  // Remove duplicate usernames in followed you notifications
  const processedNotifications = notifications.map((n) => ({
    ...n,
    message: n.message
      ? n.message.replace(`${n.from?.username} ${n.from?.username}`, n.from?.username).trim()
      : n.text,
  }));

  const handleNotificationClick = (notification) => {
    // Route to the new single post view for all post-related notifications
    if (
      ["mention", "like_post", "like_comment", "like_reply", "comment", "reply"].includes(notification.type) &&
      notification.post
    ) {
      let url = `/dashboard/community/post/${notification.post}`;
      const params = [];
      // Always use the correct comment/reply IDs for comment/reply notifications
      if ((notification.type === "comment" || notification.type === "mention") && notification.comment) {
        params.push(`commentId=${notification.comment}`);
      } else if ((notification.type === "reply" || notification.type === "like_reply") && notification.comment && notification.reply) {
        params.push(`commentId=${notification.comment}`);
        params.push(`replyId=${notification.reply}`);
      } else if (notification.type === "like_comment" && notification.comment) {
        params.push(`commentId=${notification.comment}`);
      }
      if (params.length) url += `?${params.join("&")}`;
      navigate(url);
      return;
    }
    // Fallback: handle other notification types as before
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">
            Notifications
            {loadingStates.notifications && notifications.length > 0 && (
              <span className="ml-2 inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full">
                Refreshing...
              </span>
            )}
          </h2>
        </div>

        {showLoading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading notifications...
          </div>
        ) : processedNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No notifications yet.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {processedNotifications.map((n) => (
              <li
                key={n._id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                  !n.read ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-900 dark:text-white text-sm">
                      {n.from ? (
                        <>
                          <span
                            className="font-bold text-[#1E3A8A] dark:text-[#a99d6b] hover:underline cursor-pointer"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/dashboard/community/user/${encodeURIComponent(n.from.username)}`)
                            }}
                            title={`View ${n.from.username}'s profile`}
                          >
                            {n.from.username}
                            {n.from.verified && <VerifiedBadge />}
                          </span>
                          {/* Only render the action/message, not the username again */}
                          {n.type === "follow" ? (
                            <span> followed you</span>
                          ) : n.type === "like_post" && n.post ? (
                            <Link
                              to={`/dashboard/community/post/${n.post}`}
                              className="hover:text-[#a99d6b] transition-colors"
                              style={{ textDecoration: "none" }}
                              title="Go to post"
                            >
                              {" liked your post"}
                            </Link>
                          ) : n.type === "like_comment" && n.post ? (
                            <Link
                              to={`/dashboard/community/post/${n.post}${n.comment ? `?commentId=${n.comment}` : ""}`}
                              className="hover:text-[#a99d6b] transition-colors"
                              style={{ textDecoration: "none" }}
                              title="Go to post"
                            >
                              {" liked your comment"}
                            </Link>
                          ) : n.type === "like_reply" && n.post ? (
                            <Link
                              to={`/dashboard/community/post/${n.post}${n.comment && n.reply ? `?commentId=${n.comment}&replyId=${n.reply}` : n.comment ? `?commentId=${n.comment}` : n.reply ? `?replyId=${n.reply}` : ""}`}
                              className="hover:text-[#a99d6b] transition-colors"
                              style={{ textDecoration: "none" }}
                              title="Go to post"
                            >
                              {" liked your reply"}
                            </Link>
                          ) : n.type === "comment" && n.post ? (
                            <Link
                              to={`/dashboard/community/post/${n.post}${n.comment ? `?commentId=${n.comment}` : ""}`}
                              className="hover:text-[#a99d6b] transition-colors"
                              style={{ textDecoration: "none" }}
                              title="Go to post"
                            >
                              {" commented on your post"}
                            </Link>
                          ) : n.type === "reply" && n.post ? (
                            <Link
                              to={`/dashboard/community/post/${n.post}${n.comment && n.reply ? `?commentId=${n.comment}&replyId=${n.reply}` : n.comment ? `?commentId=${n.comment}` : n.reply ? `?replyId=${n.reply}` : ""}`}
                              className="hover:text-[#a99d6b] transition-colors"
                              style={{ textDecoration: "none" }}
                              title="Go to post"
                            >
                              {" replied to your comment"}
                            </Link>
                          ) : n.type === "mention" && n.post ? (
                            <Link
                              to={`/dashboard/community/post/${n.post}${n.comment ? `?commentId=${n.comment}` : ""}`}
                              className="hover:text-[#a99d6b] transition-colors"
                              style={{ textDecoration: "none" }}
                              title="Go to post"
                            >
                              mentioned you in a comment.
                            </Link>
                          ) : (
                            <span> {n.message || n.text || "performed an action"}</span>
                          )}
                        </>
                      ) : (
                        <>{n.message || n.text}</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {formatRelativeTime(new Date(n.createdAt).getTime())}
                    </span>
                    {!n.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}