// Utilities for tagging messages and rendering WhatsApp-style reply previews

import React from 'react';

// Returns the reply preview component for a given message
export function getReplyPreview(replyToMessage, usersById, isOwn) {
  if (!replyToMessage) return null;
  // WhatsApp-style: always show a left border highlight with color #a99d6b
  const senderName = usersById?.[replyToMessage.from]?.username || (isOwn ? 'You' : 'User');
  return (
    <div className="pl-2 mb-1 text-xs bg-gray-50 dark:bg-gray-800 rounded flex flex-col border-l-4" style={{ borderColor: '#a99d6b' }}>
      <span className="font-semibold mb-0.5" style={{ color: '#a99d6b' }}>{senderName}</span>
      <div className="truncate text-gray-600 dark:text-gray-300">{replyToMessage.text || '[media]'}</div>
    </div>
  );
}

// Helper to find a message by ID in a flat array
export function findMessageById(messages, id) {
  return messages.find(m => m._id === id);
}
