import React from "react";
import useUserStatus from "../hooks/useUserStatus";

export default function UserStatus({ userId, token, typing: typingProp, online: onlineProp }) {
  const { online: onlineState, lastSeen, typing: typingState } = useUserStatus(userId, token);
  const typing = typeof typingProp === 'boolean' ? typingProp : typingState;
  const online = typeof onlineProp === 'boolean' ? onlineProp : onlineState;

  let statusText = "";
  if (typing) statusText = "Typing...";
  else if (online) statusText = "Online";
  else if (lastSeen) statusText = `Last seen ${formatLastSeen(lastSeen)}`;

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

  // Helper to zero out time for date comparison
  function stripTime(dt) {
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  const today = stripTime(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const lastSeenDay = stripTime(d);

  if (lastSeenDay.getTime() === today.getTime()) {
    // Today: show local 24hr time
    return `today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  } else if (lastSeenDay.getTime() === yesterday.getTime()) {
    // Yesterday
    return `yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  } else {
    // Before yesterday: show human-readable date
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
