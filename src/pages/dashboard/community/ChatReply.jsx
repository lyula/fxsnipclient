import React, { useState, useRef } from "react";
import { searchUsers } from "../../../utils/api"; // Adjust path as needed
import VerifiedBadge from "../../../components/VerifiedBadge";

export default function ChatReply({ onSubmit, placeholder }) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const inputRef = useRef();

  // Detect @mention and fetch suggestions
  const handleChange = async (e) => {
    const val = e.target.value;
    setValue(val);

    // Find the last @ and the word after it
    const match = val.match(/@(\w*)$/);
    if (match && match[1].length > 0) {
      setMentionQuery(match[1]);
      setShowSuggestions(true);
      // Fetch user suggestions
      const res = await searchUsers(match[1]);
      setSuggestions(res.users ? res.users.slice(0, 5) : []);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Insert selected username into input
  const handleSuggestionClick = (username) => {
    const newValue = value.replace(/@(\w*)$/, `@${username} `);
    setValue(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery("");
    inputRef.current.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue("");
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded"
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 bg-white border rounded shadow mt-1 w-full max-h-40 overflow-y-auto">
          {suggestions.map((user) => (
            <li
              key={user._id}
              className="px-3 py-2 cursor-pointer hover:bg-blue-100 flex items-center gap-1"
              onClick={() => handleSuggestionClick(user.username)}
            >
              @{user.username}
              {user.verified && <VerifiedBadge />}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}