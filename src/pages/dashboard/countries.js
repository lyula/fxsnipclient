// List of countries and their tiers
export const COUNTRIES = [
  { name: "United States", tier: 1 },
  { name: "United Kingdom", tier: 1 },
  { name: "Canada", tier: 1 },
  { name: "Germany", tier: 1 },
  { name: "France", tier: 1 },
  { name: "Japan", tier: 1 },
  { name: "Australia", tier: 1 },
  { name: "Italy", tier: 1 },
  { name: "Spain", tier: 1 },
  { name: "Netherlands", tier: 1 },
  { name: "Sweden", tier: 1 },
  { name: "Switzerland", tier: 1 },
  { name: "Norway", tier: 1 },
  { name: "Finland", tier: 1 },
  { name: "Denmark", tier: 1 },
  { name: "Belgium", tier: 1 },
  { name: "Austria", tier: 1 },
  { name: "Ireland", tier: 1 },
  { name: "New Zealand", tier: 1 },
  // ... (add all other countries, default to tier 2 or 3)
  { name: "Kenya", tier: 3 },
  { name: "Uganda", tier: 3 },
  { name: "Nigeria", tier: 3 },
  { name: "South Africa", tier: 2 },
  { name: "India", tier: 2 },
  { name: "Brazil", tier: 2 },
  { name: "China", tier: 2 },
  { name: "Russia", tier: 2 },
  { name: "Mexico", tier: 2 },
  { name: "Turkey", tier: 2 },
  { name: "Egypt", tier: 3 },
  { name: "Ghana", tier: 3 },
  { name: "Tanzania", tier: 3 },
  { name: "Rwanda", tier: 3 },
  // ... (add all countries as needed)
];

export const TIER_PRICING = {
  1: 1000, // KES per day for first world
  2: 500,  // KES per day for tier 2
  3: 200   // KES per day for tier 3
};
