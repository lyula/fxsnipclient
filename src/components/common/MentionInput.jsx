import React, { useState, useRef, useEffect } from "react";
import { FaUser } from "react-icons/fa";
import VerifiedBadge from "../VerifiedBadge";
import { searchUsers } from "../../utils/api";

const MentionInput = ({ 
  value, 
  onChange, 
  onSubmit, 
  loading, 
  placeholder, 
  disabled, 
  onClose,
  initialMention = "",
  className = ""
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(null);
  const inputRef = useRef(null);
  const suggestionContainerRef = useRef(null);

  useEffect(() => {
    if (initialMention && !value) {
      const mentionText = `@${initialMention} `;
      onChange({ target: { value: mentionText } });
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.selectionStart = inputRef.current.selectionEnd = mentionText.length;
        }
      }, 0);
    }
  }, [initialMention, value, onChange]);

  const handleInputChange = async (e) => {
    const inputValue = e.target.value;
    onChange(e);

    const caret = e.target.selectionStart;
    const textUpToCaret = inputValue.slice(0, caret);
    const mentionMatch = textUpToCaret.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setMentionStart(caret - query.length - 1);
      
      setShowSuggestions(true);
      
      try {
        const users = await searchUsers(query);
        const filteredUsers = (users.users || [])
          .filter(user => query.length === 0 || user.username.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5);
        setSuggestions(filteredUsers);
      } catch (err) {
        setSuggestions([]);
      }
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery("");
      setMentionStart(null);
    }
  };

  const handleSuggestionClick = (username) => {
    if (mentionStart === null) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice(inputRef.current.selectionStart);
    const newContent = `${before}@${username} ${after}`;
    onChange({ target: { value: newContent } });
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionQuery("");
    setMentionStart(null);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPosition = (before + "@" + username + " ").length;
        inputRef.current.selectionStart = inputRef.current.selectionEnd = newPosition;
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !showSuggestions) {
      e.preventDefault();
      onSubmit(e);
    } else if (e.key === 'Escape' && showSuggestions) {
      setShowSuggestions(false);
      setSuggestions([]);
      setMentionQuery("");
      setMentionStart(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionContainerRef.current && !suggestionContainerRef.current.contains(event.target) && 
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setSuggestions([]);
        setMentionQuery("");
        setMentionStart(null);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  return (
    <div className="w-full max-w-full">
      <form onSubmit={onSubmit} className="flex gap-2 items-center w-full max-w-full">
        <div className="flex-1 min-w-0 max-w-full">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            className={`w-full max-w-full min-w-0 border rounded px-2 py-1 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${className}`}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading || !value.trim()} 
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {loading ? "Sending..." : "Send"}
        </button>
        
        {onClose && (
          <button 
            type="button" 
            onClick={onClose} 
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
          >
            ×
          </button>
        )}
      </form>
      
      {/* Mentions list as block below the input, similar to comments/replies */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionContainerRef}
          className="mt-2 w-full max-w-full overflow-x-hidden"
        >
          <div className="border-l-2 border-blue-200 dark:border-blue-600 pl-4 space-y-2">
            {suggestions.map((user) => (
              <div key={user._id} className="w-full max-w-full overflow-x-hidden">
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(user.username)}
                  className="w-full p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <FaUser className="text-gray-600 dark:text-gray-400 text-sm" />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white break-words">
                      @{user.username}
                    </span>
                    {user.verified && <VerifiedBadge />}
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MentionInput;