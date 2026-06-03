// Curated city list for the home hero (SplitHero's cinematic photo panel).
//
// The hero shows ONLY real Google Places photos (see heroPhotos.json, layered
// in live via /api/google-photos). Each entry here just selects a city for the
// rotation and gives a focal point for the 4:3 crop — there are no bundled
// placeholder/AI images. A `key` with no matching heroPhotos.json entry is
// dropped from the rotation.
//   - `key`  → matches heroPhotos.json so the real Google photo can be shown.
//   - `city` → caption.
//   - `pos`  → object-position focal point for the photo's 4:3 crop.

export const CINEMATIC = [
  { key: "paris", city: "Paris", pos: "62% 50%" },
  { key: "amalfi", city: "Amalfi Coast", pos: "55% 50%" },
  { key: "reykjavik", city: "Reykjavík", pos: "50% 42%" },
  { key: "annecy", city: "Annecy", pos: "50% 50%" },
  { key: "copenhagen", city: "Copenhagen", pos: "55% 50%" },
];
