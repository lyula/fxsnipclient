const yourRooms = [
  {
    name: "EUR/USD Premium",
    status: "Active",
    lastMessage: "TP1 hit! Secure some profits.",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    name: "GBP/JPY Free",
    status: "Active",
    lastMessage: "New trade idea posted.",
    img: "https://randomuser.me/api/portraits/women/44.jpg",
    color: "text-green-600 dark:text-green-400",
  },
];

const suggestedRooms = [
  {
    name: "USD/JPY Pro",
    members: "200+ members",
    lastMessage: "USD/JPY approaching resistance zone.",
    img: "https://randomuser.me/api/portraits/men/45.jpg",
    color: "text-purple-600 dark:text-purple-400",
    joinLabel: "Join",
  },
  {
    name: "AUD/CAD Insights",
    members: "Free",
    lastMessage: "AUD/CAD signal coming soon!",
    img: "https://randomuser.me/api/portraits/women/36.jpg",
    color: "text-yellow-600 dark:text-yellow-400",
    joinLabel: "Join",
  },
];

export default function Signals() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Your Signal Rooms Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">Your Signal Rooms</h2>
        <div className="flex flex-col gap-3">
          {yourRooms.map((room, i) => (
            <div key={i} className="rounded border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
              <img
                src={room.img}
                alt={room.name}
                className="w-12 h-12 rounded-full object-cover border border-gray-300 dark:border-gray-700"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold truncate ${room.color}`}>{room.name}</span>
                  <span className="ml-1 text-xs text-gray-500">{room.status}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{room.lastMessage}</div>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded transition">Open</button>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Rooms Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">Suggested Rooms</h2>
        <div className="flex flex-col gap-3">
          {suggestedRooms.map((room, i) => (
            <div key={i} className="rounded border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
              <img
                src={room.img}
                alt={room.name}
                className="w-12 h-12 rounded-full object-cover border border-gray-300 dark:border-gray-700"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold truncate ${room.color}`}>{room.name}</span>
                  <span className="ml-1 text-xs text-gray-500">{room.members}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">Join to gain access</div>
              </div>
              <button className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1 rounded transition">{room.joinLabel}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}