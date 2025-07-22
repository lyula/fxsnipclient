import { useEffect, useState, useRef } from "react";
import axios from "axios";
const API_URL = import.meta.env.VITE_API_URL || "";
import { FaUser } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { markNotificationsRead } from "../../utils/api";
import VerifiedBadge from "../../components/VerifiedBadge";
import { Link } from "react-router-dom";
import { useDashboard } from "../../context/dashboard";

export default function NotificationsPage() {
  // Cache for username -> profileImage
  const [profileImages, setProfileImages] = useState({});
  const fetchingProfiles = useRef({});
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

  // Remove duplicate usernames in followed you notifications and format payment numbers
  const processedNotifications = notifications.slice(0, 100).map((n) => {
    let message = n.message
      ? n.message.replace(`${n.from?.username} ${n.from?.username}`, n.from?.username).trim()
      : n.text;
    // Format numbers with commas for payment notifications
    if (n.type === 'badge_payment' && typeof message === 'string') {
      // Replace any number (integer or decimal) with comma-formatted version
      message = message.replace(/\b(\d{1,3}(?:\d{3})*(?:\.\d+)?|\d+)(?!\d|,)/g, (num) => {
        // Only format if it's a number (not part of a word)
        if (!isNaN(num)) {
          const [intPart, decPart] = num.split('.');
          const formatted = parseInt(intPart, 10).toLocaleString();
          return decPart ? `${formatted}.${decPart}` : formatted;
        }
        return num;
      });
    }
    // Attach profileImage from cache if available
    let profileImage = undefined;
    if (n.from?.username && profileImages[n.from.username]) {
      profileImage = profileImages[n.from.username];
    }
    return { ...n, message, _profileImage: profileImage };
  });

  // Fetch missing profile images for notifications with usernames
  useEffect(() => {
    const usernamesToFetch = notifications
      .map(n => n.from?.username)
      .filter(username => username && !profileImages[username] && !fetchingProfiles.current[username]);
    if (usernamesToFetch.length === 0) return;
    usernamesToFetch.forEach(async (username) => {
      fetchingProfiles.current[username] = true;
      try {
        const res = await axios.get(`${API_URL}/user/public/${encodeURIComponent(username)}`);
        const img = res.data?.profile?.profileImage || null;
        setProfileImages(prev => ({ ...prev, [username]: img }));
      } catch (err) {
        setProfileImages(prev => ({ ...prev, [username]: null }));
      }
    });
  }, [notifications, profileImages]);

  const handleNotificationClick = (notification) => {
    // Payment notification: go to payment details (journal payments)
    if (notification.type === "journal_payment" && notification.payment) {
      navigate(`/dashboard/journal-payment/${notification.payment}`);
      return;
    }
    if (notification.type === "badge_payment" && notification.payment) {
      navigate(`/dashboard/payment/${notification.payment}`);
      return;
    }
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
    <div className="flex-1 min-h-0 mx-0 p-0" style={{ fontFamily: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', Arial, sans-serif`, fontSize: 'inherit' }}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 md:p-8 flex-1 min-h-0">
        <div className="p-0 md:p-4 border-b border-gray-200 dark:border-gray-700 mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Notifications
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
          <ul>
            {processedNotifications.map((n) => (
              <li
                key={n._id}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                  !n.read ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
                onClick={() => handleNotificationClick(n)}
                style={{ cursor: ((n.type === "badge_payment" || n.type === "journal_payment") && n.payment) ? "pointer" : undefined }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-900 dark:text-white text-sm">
                      {/* Payment notification message */}
                      {n.type === "badge_payment" ? (
                        <span className="font-semibold text-black dark:text-[#a99d6b]">{n.message}</span>
                      ) : n.from ? (
                        <>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-flex items-center gap-2 font-bold text-[#1E3A8A] dark:text-[#a99d6b] hover:underline cursor-pointer"
                              onClick={e => {
                                e.stopPropagation();
                                navigate(`/dashboard/community/user/${encodeURIComponent(n.from.username)}`)
                              }}
                              title={`View ${n.from.username}'s profile`}
                            >
                              {/* Profile image or fallback icon */}
                              {n._profileImage ? (
                                <img
                                  src={n._profileImage}
                                  alt={n.from.username + "'s profile"}
                                  className="w-6 h-6 rounded-full object-cover border border-gray-300 dark:border-gray-600"
                                  onError={e => { e.target.onerror = null; e.target.src = "/default-avatar.png"; }}
                                />
                              ) : (
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                                  <FaUser className="w-4 h-4 text-gray-400" />
                                </span>
                              )}
                              <span className="flex items-center">
                                {n.from.username}{n.from.verified && <VerifiedBadge />}
                              </span>
                            </span>
                            <span className="ml-1">
                              {n.type === "follow" ? (
                                <> followed you</>
                              ) : n.type === "like_post" && n.post ? (
                                <Link
                                  to={`/dashboard/community/post/${n.post}`}
                                  className="hover:text-[#a99d6b] transition-colors"
                                  style={{ textDecoration: "none" }}
                                  title="Go to post"
                                >
                                  liked your post
                                </Link>
                              ) : n.type === "like_comment" && n.post ? (
                                <Link
                                  to={`/dashboard/community/post/${n.post}${n.comment ? `?commentId=${n.comment}` : ""}`}
                                  className="hover:text-[#a99d6b] transition-colors"
                                  style={{ textDecoration: "none" }}
                                  title="Go to post"
                                >
                                  liked your comment
                                </Link>
                              ) : n.type === "like_reply" && n.post ? (
                                <Link
                                  to={`/dashboard/community/post/${n.post}${n.comment && n.reply ? `?commentId=${n.comment}&replyId=${n.reply}` : n.comment ? `?commentId=${n.comment}` : n.reply ? `?replyId=${n.reply}` : ""}`}
                                  className="hover:text-[#a99d6b] transition-colors"
                                  style={{ textDecoration: "none" }}
                                  title="Go to post"
                                >
                                  liked your reply
                                </Link>
                              ) : n.type === "comment" && n.post ? (
                                <Link
                                  to={`/dashboard/community/post/${n.post}${n.comment ? `?commentId=${n.comment}` : ""}`}
                                  className="hover:text-[#a99d6b] transition-colors"
                                  style={{ textDecoration: "none" }}
                                  title="Go to post"
                                >
                                  commented on your post
                                </Link>
                              ) : n.type === "reply" && n.post ? (
                                <Link
                                  to={`/dashboard/community/post/${n.post}${n.comment && n.reply ? `?commentId=${n.comment}&replyId=${n.reply}` : n.comment ? `?commentId=${n.comment}` : n.reply ? `?replyId=${n.reply}` : ""}`}
                                  className="hover:text-[#a99d6b] transition-colors"
                                  style={{ textDecoration: "none" }}
                                  title="Go to post"
                                >
                                  replied to your comment
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
                                <> {n.message || n.text || "performed an action"}</>
                              )}
                            </span>
                          </span>
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