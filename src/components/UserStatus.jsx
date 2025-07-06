import React from "react";
import useUserStatus from "../../hooks/useUserStatus";

export default function UserStatus({ userId, token }) {
  const { online, lastSeen, typing } = useUserStatus(userId, token);

  let statusText = "";
  if (online) statusText = "Online";
  else if (lastSeen) statusText = `Last seen ${formatLastSeen(lastSeen)}`;
  if (typing) statusText = "Typing...";

  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center min-h-[1.2em]">
      {statusText}
    </div>
  );
}

function formatLastSeen(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return d.toLocaleString();
}
