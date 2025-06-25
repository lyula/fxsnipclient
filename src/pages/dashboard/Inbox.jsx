import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { getConversations, getConversation, sendMessage } from "../../utils/api";
import { jwtDecode } from "jwt-decode";

export default function Inbox(props) {
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
  const messagesContainerRef = useRef(null);

  // When chatUsername is present, select or create that user
  useEffect(() => {
    if (chatUsername && users.length > 0) {
      let user = users.find(
        u => u.username && u.username.toLowerCase() === chatUsername.toLowerCase()
      );
      if (user) {
        setSelectedUser(user);
      }
    }
    // If chatUsername is not present, clear selectedUser to show conversation list
    if (!chatUsername) {
      setSelectedUser(null);
    }
  }, [chatUsername, users]);

  useEffect(() => {
    if (selectedUser) setMessages(Array.isArray(selectedUser.messages) ? selectedUser.messages : []);
  }, [selectedUser]);

  // Scroll to the latest message when messages or selectedUser change
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
    return () => {
      if (messagesEndRef.current && messagesContainerRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" });
      }
    };
  }, [messages, selectedUser]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (input.trim() && selectedUser && selectedUser._id) {
      try {
        const newMsg = await sendMessage(selectedUser._id, input);
        if (newMsg && newMsg.text) {
          setMessages(prev => [...prev, newMsg]);
          setInput("");
          setUsers(prev =>
            prev
              .map(u =>
                u._id === selectedUser._id
                  ? {
                      ...u,
                      lastMessage: newMsg.text,
                      lastTime: new Date(newMsg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    }
                  : u
              )
              .sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime)) // Re-sort after updating
          );
        } else {
          alert("Failed to send message.");
        }
      } catch (err) {
        alert("Network error. Please try again.");
      }
    }
  };

  // Debounced search for users from backend
  useEffect(() => {
    if (search.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
          /\/auth$/,
          ""
        );
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
              _id: u._id,
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
      clearTimeout(timeout),
      controller.abort();
    };
  }, [search]);

  // Fetch conversations on mount
  useEffect(() => {
    getConversations().then(data => {
      setUsers(
        data
          .map(conv => ({
            _id: conv.user._id,
            username: conv.user.username,
            avatar: conv.user.countryFlag
              ? conv.user.countryFlag
              : "https://ui-avatars.com/api/?name=" + encodeURIComponent(conv.user.username),
            lastMessage: conv.lastMessage.text,
            lastTime: new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            unreadCount: conv.unreadCount || 0,
          }))
          .sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime)) // Sort by latest message time
      );
    });
  }, []);

  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      getConversation(selectedUser._id).then(msgs => setMessages(msgs));
    }
  }, [selectedUser]);

  const token = localStorage.getItem("token");
  let myUserId = "";
  if (token) {
    try {
      const decoded = jwt_decode(token);
      myUserId = decoded.id || decoded._id || decoded.userId || "";
    } catch (e) {
      myUserId = "";
    }
  }

  // Group messages by date for rendering
  function groupMessagesByDate(messages) {
    const groups = [];
    let lastDate = null;
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.createdAt);
      const msgDay = msgDate.getDate();
      const msgMonth = msgDate.getMonth();
      const msgYear = msgDate.getFullYear();

      let label = "";
      if (
        msgDay === today.getDate() &&
        msgMonth === today.getMonth() &&
        msgYear === today.getFullYear()
      ) {
        label = "Today";
      } else if (
        msgDay === yesterday.getDate() &&
        msgMonth === yesterday.getMonth() &&
        msgYear === yesterday.getFullYear()
      ) {
        label = "Yesterday";
      } else {
        label = `${String(msgDay).padStart(2, "0")}/${String(msgMonth + 1).padStart(
          2,
          "0"
        )}/${String(msgYear).slice(-2)}`;
      }

      const dateKey = `${msgYear}-${msgMonth + 1}-${msgDay}`;
      if (!lastDate || lastDate !== dateKey) {
        groups.push({ type: "date", label });
        lastDate = dateKey;
      }
      groups.push({
        type: "msg",
        msg,
        isFirstInGroup: index === 0 && messages.length > 1 ? true : new Date(messages[index - 1]?.createdAt).getDate() !== msgDay,
        originalIndex: index,
      });
    });
    return groups;
  }

  // Find the index of the last message sent by the user
  const lastUserMessageIndex = messages
    .map((msg, idx) => ({ msg, idx }))
    .filter(({ msg }) => msg.from === myUserId)
    .reduce((maxIdx, { idx }) => Math.max(maxIdx, idx), -1);

  // Count conversations with unread messages
  useEffect(() => {
    const unreadConversations = users.filter(u => u.unreadCount > 0).length;
    // Call a prop function if provided
    if (typeof props.setUnreadConversations === "function") {
      props.setUnreadConversations(unreadConversations);
    }
  }, [users]);

  // If no user selected, show chat list or start messaging UI
  if (!selectedUser) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col h-screen bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow p-0">
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
            <ul className="absolute left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded shadow-lg mt-1 max-h-none overflow-visible">
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
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-800 transition relative"
                onClick={() => {
                  setSelectedUser(user);
                  navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                }}
              >
                <div className="relative">
                  <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full" />
                  {/* Remove unread badge here */}
                </div>
                <div className="flex-1 text-left">
                  <div className={`text-gray-900 dark:text-white ${user.unreadCount > 0 ? "font-bold" : "font-normal"}`}>
                    {user.username}
                  </div>
                  <div className={`text-xs truncate ${user.unreadCount > 0 ? "font-bold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                    {user.lastMessage}
                  </div>
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
  if (selectedUser) {
    // Group messages by date for rendering
    const groupedMessages = groupMessagesByDate(messages);

    return (
      <div className="w-full max-w-lg mx-auto h-screen flex flex-col bg-gray-50 dark:bg-gray-900 rounded-none sm:rounded-xl shadow p-0">
        {/* Sticky Header with Username */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-30"
          style={{ minHeight: "56px" }}
        >
          <button
            onClick={() => {
              setSelectedUser(null);
              navigate("/dashboard/inbox");
            }}
            className="mr-2 text-[#a99d6b] font-bold text-lg px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-gray-700 transition"
          >
            ←
          </button>
          <img
            src={selectedUser.avatar}
            alt={selectedUser.username}
            className="w-10 h-10 rounded-full"
          />
          <span className="font-bold text-gray-900 dark:text-white text-lg truncate">
            {selectedUser.username}
          </span>
        </div>
        {/* Scrollable Messages */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="absolute inset-0 overflow-y-auto no-scrollbar px-4 py-3"
            style={{ top: "0px" }}
          >
            <style>
              {`
                .no-scrollbar {
                  scrollbar-width: none; /* Firefox */
                }
                .no-scrollbar::-webkit-scrollbar {
                  display: none; /* Chrome, Safari, Edge */
                }
              `}
            </style>
            <div>
              {groupedMessages.map((item, idx) =>
                item.type === "date" ? (
                  <div
                    key={`date-${idx}`}
                    className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 my-4"
                  >
                    <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <div
                    key={`msg-${idx}`}
                    className={`flex ${
                      item.msg.from === myUserId ? "justify-end" : "justify-start"
                    } ${item.isFirstInGroup ? "mt-4" : "mt-1"} mb-2 flex-col`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
                        item.msg.from === myUserId
                          ? "bg-blue-500 text-white rounded-br-none"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none"
                      } ${item.msg.from === myUserId ? "ml-auto" : "mr-auto"}`}
                    >
                      {item.msg.text}
                      <div className="text-[10px] text-right mt-1 opacity-60">
                        {new Date(item.msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {/* Show read status only for the last message sent by the user */}
                    {item.msg.from === myUserId && item.originalIndex === lastUserMessageIndex && (
                      <div
                        className={`text-[10px] mt-1 opacity-60 flex ${
                          item.msg.from === myUserId ? "justify-end" : "justify-start"
                        }`}
                      >
                        {item.msg.read ? (
                          <span className="text-gray-800 dark:text-green-400">Seen</span>
                        ) : (
                          <span className="text-gray-800 dark:text-gray-400">Delivered</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
              <div ref={messagesEndRef} style={{ height: "0px" }} />
            </div>
          </div>
        </div>
        {/* Input */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky bottom-0 z-40"
          style={{ minHeight: "72px" }}
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

  // Fallback return (should not reach here due to above conditions)
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-screen bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow p-0">
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
          <ul className="absolute left-0 right-0 z-20 bg-white dark:bg-gray-900 border border-blue-100 dark:border-gray-800 rounded shadow-lg mt-1 max-h-none overflow-visible">
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
                className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-800 transition relative"
                onClick={() => {
                  setSelectedUser(user);
                  navigate(`/dashboard/inbox?chat=${encodeURIComponent(user.username)}`);
                }}
              >
                <div className="relative">
                  <img src={user.avatar} alt={user.username} className="w-10 h-10 rounded-full" />
                  {/* Remove unread badge here */}
                </div>
                <div className="flex-1 text-left">
                  <div className={`text-gray-900 dark:text-white ${user.unreadCount > 0 ? "font-bold" : "font-normal"}`}>
                    {user.username}
                  </div>
                  <div className={`text-xs truncate ${user.unreadCount > 0 ? "font-bold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                    {user.lastMessage}
                  </div>
                </div>
                <div className="text-xs text-gray-400">{user.lastTime}</div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }
