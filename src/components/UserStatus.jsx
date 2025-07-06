import React from "react";
import useUserStatus from "../hooks/useUserStatus";

export default function UserStatus({ userId, token, showTypingDots = false }) {
  const { online, lastSeen, typing } = useUserStatus(userId, token);

  let statusText = "";
  if (online) statusText = "Online";
  else if (lastSeen) statusText = `Last seen ${formatLastSeen(lastSeen)}`;

  // If showTypingDots is true and typing, show animated dots
  if (showTypingDots && typing) {
    return (
      <div className="flex items-center mt-1 min-h-[1.2em]">
        <span
          className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce mr-1"
          style={{ animationDelay: "0ms" }}
        ></span>
        <span
          className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce mr-1"
          style={{ animationDelay: "150ms" }}
        ></span>
        <span
          className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        ></span>
      </div>
    );
  }

  // Normal status (left-aligned, below username)
  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 min-h-[1.2em] text-left">
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
