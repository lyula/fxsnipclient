// Country data with ISO codes and neighbors
export const COUNTRY_DATA = [
  { name: "Kenya", code: "KE", neighbors: ["UG", "TZ", "ET", "SS", "SO"] },
  { name: "Uganda", code: "UG", neighbors: ["KE", "TZ", "RW", "CD", "SS"] },
  { name: "Tanzania", code: "TZ", neighbors: ["KE", "UG", "RW", "ZM", "MW", "MZ", "CD", "BI"] },
  { name: "Ethiopia", code: "ET", neighbors: ["KE", "SD", "SS", "ER", "DJ", "SO"] },
  { name: "South Sudan", code: "SS", neighbors: ["SD", "ET", "KE", "UG", "CD", "CF"] },
  { name: "Somalia", code: "SO", neighbors: ["ET", "KE", "DJ"] },
  { name: "Rwanda", code: "RW", neighbors: ["UG", "TZ", "BI", "CD"] },
  { name: "Burundi", code: "BI", neighbors: ["RW", "TZ", "CD"] },
  { name: "Democratic Republic of the Congo", code: "CD", neighbors: ["UG", "RW", "BI", "TZ", "ZM", "AO", "CF", "SS"] },
  { name: "Sudan", code: "SD", neighbors: ["EG", "LY", "TD", "CF", "SS", "ET", "ER"] },
  { name: "Eritrea", code: "ER", neighbors: ["SD", "ET", "DJ"] },
  { name: "Djibouti", code: "DJ", neighbors: ["ER", "ET", "SO"] },
  // ... add more countries as needed ...
];

// Helper to get flag emoji from ISO code
export function getFlagEmoji(code) {
  if (!code) return "";
  return code
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
}
