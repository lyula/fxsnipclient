import React from "react";

export function renderHighlightedContent(content) {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} className="text-blue-600">{part}</span>
      : <span key={i}>{part}</span>
  );
}