// client/src/utils/formatDate.js

export function formatPostDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // difference in seconds

  if (diff < 60) return "just now";
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${mins} min${mins > 1 ? "s" : ""} ago`;
  }
  if (diff < 86400) {
    const hrs = Math.floor(diff / 3600);
    return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  }
  if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
  if (diff < 2592000) {
    const weeks = Math.floor(diff / 604800);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diff < 31536000) {
    const months = Math.floor(diff / 2592000);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diff / 31536000);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}