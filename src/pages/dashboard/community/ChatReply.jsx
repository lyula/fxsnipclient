import React, { useState } from "react";

export default function ChatReply({ onSubmit, placeholder }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex gap-2 mt-2"
      onSubmit={e => {
        e.preventDefault();
        if (value.trim()) {
          onSubmit(value);
          setValue("");
        }
      }}
    >
      <input
        className="flex-1 rounded border px-2 py-1 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
      >
        Send
      </button>
    </form>
  );
}