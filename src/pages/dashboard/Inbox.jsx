import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

const users = [
  {
    name: "Jane Trader",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    lastMessage: "Thank you! Let me know if you want to discuss setups.",
    lastTime: "09:02",
    messages: [
      {
        from: "Jane Trader",
        text: "Hey there! 👋",
        time: "09:00",
      },
      {
        from: "You",
        text: "Hi Jane! Congrats on your last trade 🚀",
        time: "09:01",
      },
      {
        from: "Jane Trader",
        text: "Thank you! Let me know if you want to discuss setups.",
        time: "09:02",
      },
    ],
  },
  {
    name: "John FX",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    lastMessage: "Let's catch up on GBP/USD later.",
    lastTime: "Yesterday",
    messages: [
      {
        from: "You",
        text: "Hey John, what's your view on GBP/USD?",
        time: "Yesterday",
      },
      {
        from: "John FX",
        text: "Let's catch up on GBP/USD later.",
        time: "Yesterday",
      },
    ],
  },
];

export default function Inbox() {
  const location = useLocation();
  const navigate = useNavigate();
  const to = location.state?.to;
  const [selectedUser, setSelectedUser] = useState(
    to ? users.find(u => u.name === to) : null
  );
  const [messages, setMessages] = useState(selectedUser ? selectedUser.messages : []);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser) setMessages(selectedUser.messages);
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]);

  const handleSend = (e) => {
    e.preventDefault();
    if (input.trim() && selectedUser) {
      setMessages([
        ...messages,
        { from: "You", text: input, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
      setInput("");
    }
  };

  // If no user selected, show chat list
  if (!selectedUser) {
    return (
      <div className="w-full max-w-lg mx-auto flex flex-col h-[70vh] bg-white dark:bg-gray-800 rounded-xl shadow p-0">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
          <span className="font-bold text-gray-900 dark:text-white text-lg">Inbox</span>
        </div>
        <div className="flex-1 overflow-y-auto px-0 py-0 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
          {users.map(user => (
            <button
              key={user.name}
              className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-gray-800 transition"
              onClick={() => setSelectedUser(user)}
            >
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
              <div className="flex-1 text-left">
                <div className="font-bold text-gray-900 dark:text-white">{user.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.lastMessage}</div>
              </div>
              <div className="text-xs text-gray-400">{user.lastTime}</div>
            </button>
          ))}
          {users.length === 0 && (
            <div className="text-center text-gray-400 py-10">No conversations yet.</div>
          )}
        </div>
      </div>
    );
  }

  // If user selected, show chat view
  return (
    <div className="w-full max-w-lg mx-auto flex flex-col h-[70vh] bg-white dark:bg-gray-800 rounded-xl shadow p-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
        <button
          onClick={() => setSelectedUser(null)}
          className="mr-2 text-[#a99d6b] font-bold text-lg px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-gray-700 transition"
        >
          &larr;
        </button>
        <img src={selectedUser.avatar} alt={selectedUser.name} className="w-10 h-10 rounded-full" />
        <span className="font-bold text-gray-900 dark:text-white text-lg">{selectedUser.name}</span>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 dark:bg-gray-900">
        {messages.map((msg, idx) => (
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
        className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl"
      >
        <input
          className="flex-1 rounded-full border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none"
          placeholder={`Message ${selectedUser.name}...`}
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