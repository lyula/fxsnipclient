import React, { useState } from "react";

export default function ChatInput({ onSend }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={e => {
        e.preventDefault();
        if (value.trim()) {
          onSend(value);
          setValue("");
        }
      }}
    >
      <input
        className="flex-1 rounded border px-2 py-2"
        placeholder="What's happening?"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Post
      </button>
    </form>
  );
}