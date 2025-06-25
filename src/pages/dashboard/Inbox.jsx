import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

export default function Inbox() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const chatUsername = query.get("chat");

  // All conversations in this session
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // When chatUsername is present, select or create that user
  useEffect(() => {
    if (chatUsername) {
      let user = users.find(
        u => u.username && u.username.toLowerCase() === chatUsername.toLowerCase()
      );
      if (!user) {
        user = {
          username: chatUsername,
          avatar: "https://ui-avatars.com/api/?name=" + encodeURIComponent(chatUsername),
          messages: [],
          lastMessage: "",
          lastTime: "",
        };
        setUsers(prev => [...prev, user]);
        setSelectedUser(user); // <-- Fix: setSelectedUser immediately for new user
      } else {
        setSelectedUser(user);
      }
    }
  }, [chatUsername, users]);

  useEffect(() => {
    if (selectedUser) setMessages(Array.isArray(selectedUser.messages) ? selectedUser.messages : []);
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && selectedUser) {
      const newMsg = {
        from: "You",
        text: input,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([...messages, newMsg]);
      setUsers(prev =>
        prev.map(u =>
          u.username === selectedUser.username
            ? {
                ...u,
                messages: [...u.messages, newMsg],
                lastMessage: input,
                lastTime: newMsg.time,
              }
            : u
        )
      );
      setInput("");
    }
  }; // <-- This closing brace and semicolon fixes the syntax error

  // Debounced search for users from backend
  useEffect(() => {
    if (search.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/auth$/, "");
        const res = await fetch(`${API_BASE}/user/search?q=${encodeURIComponent(search)}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            (data.users || []).map(u => ({
              username: u.username,
              avatar: u.countryFlag
                ? u.countryFlag
                : "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.username),
            }))
          );
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setSearchResults([]);
        }
      }
    }, 300); // debounce

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  // If no user selected, show chat list or start messaging UI
  if (!selectedUser) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col h-screen bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow p-0">
        {/* Removed the default Inbox header */}
        {/* Always show search at the top */}
        <div className="relative w-full max-w-xs mx-auto mt-4 mb-2">
          <input
            className="w-full rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
            placeholder="Search user to message..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"
          />
          {/* Render search results dropdown */}
          {search && searchResults.length > 0 && (
            <ul className="absolute left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded shadow-lg mt-1
              max-h-none overflow-visible">
              {searchResults.map(user => (
                <li
                  key={user.username}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-blue-50 dark:hover:bg-gray-800 cursor-pointer transition"
                  onClick={() => {
                    setSelectedUser(user);
                    navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                  }}
                >
                  <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full" />
                  <span className="font-bold text-gray-900 dark:text-white">{user.username}</span>
                </li>
              ))}
            </ul>
          )}
          {search && searchResults.length === 0 && (
            <div className="absolute left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded shadow-lg mt-1 p-3 text-xs text-gray-500">
              No users found.
            </div>
          )}
        </div>
        {/* Conversation list below search */}
        <div className="flex-1 px-0 py-0 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-lg">
              Start messaging
            </div>
          ) : (
            users.map(user => (
              <button
                key={user.username}
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-800 transition"
                onClick={() => {
                  setSelectedUser({
                    ...user,
                    messages: Array.isArray(user.messages) ? user.messages : [],
                  });
                  navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                }}
              >
                <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full" />
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-900 dark:text-white">{user.username}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.lastMessage}</div>
                </div>
                <div className="text-xs text-gray-400">{user.lastTime}</div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }
  // If user selected, show chat view
  return (
    <div className="w-full max-w-lg mx-auto h-screen flex flex-col bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow p-0">
      {/* Sticky Header with Username */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-20"
        style={{ minHeight: "56px" }}
      >
        <button
          onClick={() => {
            setSelectedUser(null);
            navigate("/dashboard/inbox");
          }}
          className="mr-2 text-[#a99d6b] font-bold text-lg px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-gray-700 transition"
        >
          &larr;
        </button>
        <img src={selectedUser.avatar} alt={selectedUser.username} className="w-10 h-10 rounded-full" />
        <span className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedUser.username}</span>
      </div>
      {/* Scrollable Messages */}
      <div
        className="flex-1 px-4 py-3 space-y-3 bg-gray-50 dark:bg-gray-900 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {(messages || []).map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.from === "You" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                msg.from === "You"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
              }`}
            >
              {msg.text}
              <div className="text-[10px] text-right mt-1 opacity-60">{msg.time}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0 z-10"
        style={{ background: "inherit" }}
      >
        <input
          className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
          placeholder={`Message ${selectedUser.username}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
