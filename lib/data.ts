export type Property = {
  slug: string;
  name: string;
  location: string;
  type: string;
  price: number;
  image: string;
  gallery: string[];
  description: string;
  area: string;
  homes: number;
  status: string;
  amenities: string[];
};
export const properties: Property[] = [
  {
    slug: "windsor-gardens",
    name: "Windsor Gardens",
    location: "Whitefield, Bengaluru",
    type: "Apartment",
    price: 2.4,
    image: "windsor",
    gallery: ["windsor", "interior1", "pool", "garden"],
    description:
      "A quieter rhythm, just beyond the city. Light-filled residences open onto generous terraces and a landscape designed to grow more beautiful with time.",
    area: "12.5 acres",
    homes: 184,
    status: "Ready to move",
    amenities: [
      "Swimming pool",
      "Fitness studio",
      "Garden walks",
      "Residents’ clubhouse",
    ],
  },
  {
    slug: "park-west",
    name: "Park West",
    location: "Banashankari, Bengaluru",
    type: "Apartment",
    price: 1.8,
    image: "park",
    gallery: ["park", "interior2", "fitness", "lounge"],
    description:
      "An urban address with a generous green heart. Thoughtful homes, sheltered courtyards and spaces to come together make everyday living feel effortless.",
    area: "8.2 acres",
    homes: 126,
    status: "December 2027",
    amenities: [
      "Fitness studio",
      "Courtyard garden",
      "Indoor recreation",
      "Children’s play area",
    ],
  },
  {
    slug: "courtyard-residences",
    name: "The Courtyard Residences",
    location: "Alibaug, Mumbai",
    type: "Villa",
    price: 4.6,
    image: "courtyard",
    gallery: ["courtyard", "interior3", "garden", "pool"],
    description:
      "Private villas shaped around an intimate courtyard. Natural materials and open living spaces bring the changing light and the coastal landscape into your home.",
    area: "6.8 acres",
    homes: 32,
    status: "Ready to move",
    amenities: [
      "Private gardens",
      "Swimming pool",
      "Outdoor seating",
      "Clubhouse",
    ],
  },
  {
    slug: "azure-heights",
    name: "Azure Heights",
    location: "Worli, Mumbai",
    type: "Apartment",
    price: 5.2,
    image: "azure",
    gallery: ["azure", "interior4", "pool", "lounge"],
    description:
      "Above the energy of the city, a home with room to breathe. Expansive views, refined interiors and a considered collection of amenities define a new perspective.",
    area: "4.6 acres",
    homes: 96,
    status: "June 2028",
    amenities: [
      "Sky lounge",
      "Swimming pool",
      "Wellness studio",
      "Indoor recreation",
    ],
  },
  {
    slug: "grand-address",
    name: "The Grand Address",
    location: "Jubilee Hills, Hyderabad",
    type: "Villa",
    price: 3.8,
    image: "grand",
    gallery: ["grand", "interior5", "garden", "fitness"],
    description:
      "A limited collection of private residences nestled within a mature landscape. Quiet streets, generous proportions and beautifully crafted details reward a slower way of living.",
    area: "10 acres",
    homes: 48,
    status: "March 2027",
    amenities: [
      "Clubhouse",
      "Landscaped gardens",
      "Fitness studio",
      "Children’s play area",
    ],
  },
];
export const amenityImages = [
  { id: "pool", name: "Swimming pool", text: "A little room to drift." },
  {
    id: "fitness",
    name: "Fitness studio",
    text: "Space for your daily rituals.",
  },
  { id: "garden", name: "Landscaped gardens", text: "Find a moment of green." },
  {
    id: "lounge",
    name: "Residents’ clubhouse",
    text: "Good company. Beautiful surroundings.",
  },
  {
    id: "play",
    name: "Children’s play area",
    text: "Small adventures, every day.",
  },
  {
    id: "recreation",
    name: "Indoor recreation",
    text: "Time together, well spent.",
  },
  { id: "outdoor", name: "Outdoor seating", text: "Stay a little longer." },
];
export const photo = (id: string) =>
  `/images/${id === "hero" ? "hero-exterior" : id}.jpg`;
