// Curated image set for the home hero (SplitHero's cinematic photo panel).
//
// All paths point at existing assets under public/images/cities/<Country>/<city>/.
// Each city has a square `thumbnail.jpeg`; a handful also have a wide `hero.jpeg`.
// We ship small, hand-picked subsets so the hero stays light.

const CITIES = "/images/cities";

/**
 * Wide hero photos for the Cinematic + Split crossfade. Only cities that actually
 * have a `hero.jpeg`; favored for strong, legible compositions.
 */
export const CINEMATIC = [
  { src: `${CITIES}/France/paris/hero-2x.jpeg`,    city: "Paris" },
  { src: `${CITIES}/Italy/amalfi/hero.jpeg`,       city: "Amalfi Coast" },
  { src: `${CITIES}/Iceland/reykjavik/hero.jpeg`,  city: "Reykjavík" },
  { src: `${CITIES}/France/annecy/hero.jpeg`,      city: "Annecy" },
  { src: `${CITIES}/Denmark/copenhagen/hero.jpeg`, city: "Copenhagen" },
];

