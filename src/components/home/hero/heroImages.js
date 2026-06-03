// Curated city list for the home hero (SplitHero's cinematic photo panel).
//
// The hero shows real Google Places photos baked to LOCAL static files at
// curation time by scripts/fetchHomeHeroPhotos.mjs (output recorded in
// heroPhotos.json with a `local` path + attribution). Serving local files —
// instead of resolving a Google photo URL at runtime — means the panel never
// flashes its dark placeholder ("black Paris") and the images cache properly.
//
//   - `key`   → matches heroPhotos.json so the baked photo + attribution resolve.
//   - `city`  → caption.
//   - `query` → Google Places text query the fetch script uses to source a photo.
//   - `pos`   → object-position focal point for the crop.
//
// A `key` with no matching heroPhotos.json entry is dropped from the rotation.

export const CINEMATIC = [
  { key: "paris", city: "Paris", query: "Eiffel Tower, Paris, France", pos: "50% 45%" },
  { key: "rome", city: "Rome", query: "Colosseum, Rome, Italy", pos: "50% 50%" },
  { key: "barcelona", city: "Barcelona", query: "Sagrada Família, Barcelona, Spain", pos: "50% 40%" },
  { key: "amalfi", city: "Amalfi Coast", query: "Positano, Amalfi Coast, Italy", pos: "50% 50%" },
  { key: "santorini", city: "Santorini", query: "Oia, Santorini, Greece", pos: "50% 50%" },
  { key: "lisbon", city: "Lisbon", query: "Alfama old town, Lisbon, Portugal", pos: "50% 50%" },
  { key: "prague", city: "Prague", query: "Charles Bridge, Prague, Czechia", pos: "50% 45%" },
  { key: "copenhagen", city: "Copenhagen", query: "Nyhavn, Copenhagen, Denmark", pos: "50% 50%" },
];
