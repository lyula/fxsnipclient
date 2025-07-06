import React from "react";
import { Link } from "react-router-dom";

export function renderHighlightedContent(content) {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? (
          <Link
            key={i}
            to={`/dashboard/community/user/${encodeURIComponent(part.slice(1))}`}
            className="text-blue-600 hover:underline cursor-pointer font-medium"
            style={{ cursor: 'pointer' }}
          >
            {part}
          </Link>
        )
      : <span key={i}>{part}</span>
  );
}