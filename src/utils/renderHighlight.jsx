import React from "react";
import { Link } from "react-router-dom";

export function renderHighlightedContent(content) {
  // Regex matches @username where username is word chars, not followed by more word chars (to avoid partial matches)
  // Handles mentions at end, before tags, or before punctuation
  const mentionRegex = /@([a-zA-Z0-9_]+)(?![a-zA-Z0-9_])/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // Push text before the mention
    if (match.index > lastIndex) {
      elements.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>);
    }
    // Push the mention as a Link
    const username = match[1];
    elements.push(
      <Link
        key={match.index}
        to={`/dashboard/community/user/${encodeURIComponent(username)}`}
        className="text-blue-600 hover:underline cursor-pointer font-medium"
        style={{ cursor: 'pointer' }}
      >
        @{username}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }
  // Push any remaining text after the last mention
  if (lastIndex < content.length) {
    elements.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>);
  }
  return elements;
}
