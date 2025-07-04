// client/src/utils/formatDate.js

export function formatPostDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // difference in seconds

  if (diff < 60) return "now";
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins}m ago`;  // Changed from "mins ago" to "m"
  }
  if (diff < 86400) {
    const hrs = Math.floor(diff / 3600);
    return `${hrs}h ago`;   // Changed from "hrs ago" to "h"
  }
  if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days}d ago`;  // Changed from "days ago" to "d"
  }
  if (diff < 2592000) {
    const weeks = Math.floor(diff / 604800);
    return `${weeks}w ago`;  // Changed from "weeks ago" to "w"
  }
  if (diff < 31536000) {
    const months = Math.floor(diff / 2592000);
    return `${months}mo ago`; // Changed from "months ago" to "mo"
  }
  const years = Math.floor(diff / 31536000);
  return `${years}y ago`;    // Changed from "years ago" to "y"
}