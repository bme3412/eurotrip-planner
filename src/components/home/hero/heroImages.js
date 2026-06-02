// Curated image set for the home hero (SplitHero's cinematic photo panel).
//
// All paths point at existing assets under public/images/cities/<Country>/<city>/.
// Each city has a square `thumbnail.jpeg`; a handful also have a wide `hero.jpeg`.
// We ship small, hand-picked subsets so the hero stays light.

const CITIES = "/images/cities";

/**
 * Hero photos for the SplitHero crossfade. The bundled `src` is the always-available
 * base layer (also the AI fallback); where `heroPhotos.json` has a real Google Places
 * photo for the matching `key`, SplitHero overlays it live via /api/google-photos.
 * Each entry carries:
 *   - `key`  → matches heroPhotos.json so a real Google photo can be layered on top.
 *   - `pos`  → object-position focal point for the bundled image's 4:3 crop.
 *   - `blur` → a tiny pre-generated base64 preview for next/image's blur-up placeholder.
 */
export const CINEMATIC = [
  {
    src: `${CITIES}/France/paris/hero-2x.jpeg`,
    key: "paris",
    city: "Paris",
    pos: "62% 50%",
    blur: "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAJABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABQAE/8QAIhAAAQMDAwUAAAAAAAAAAAAAAQACAwQFERIhMTRxcqGx/8QAFAEBAAAAAAAAAAAAAAAAAAAAAf/EABcRAQADAAAAAAAAAAAAAAAAAAABERL/2gAMAwEAAhEDEQA/ANwulHHuC8O5zgAqdcIJRqDHv0jI3AJ9oOflvYfEjWdVB4BOpFP/2Q==",
  },
  {
    src: `${CITIES}/Italy/amalfi/hero.jpeg`,
    key: "amalfi",
    city: "Amalfi Coast",
    pos: "55% 50%",
    blur: "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAJABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAABAP/xAAlEAACAQICCwAAAAAAAAAAAAABAgMABBMxBREhMjRhYnGBsdH/xAAVAQEBAAAAAAAAAAAAAAAAAAACA//EABgRAAMBAQAAAAAAAAAAAAAAAAABEQID/9oADAMBAAIRAxEAPwA99pCSSXDdhHETkuQ+0SYRq2GpL9WvYOdFut7wPVWtuHl7rS6KKksarh//2Q==",
  },
  {
    src: `${CITIES}/Iceland/reykjavik/hero.jpeg`,
    key: "reykjavik",
    city: "Reykjavík",
    pos: "50% 42%",
    blur: "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAJABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAgP/xAAkEAABAwIEBwAAAAAAAAAAAAABAAIDERIFFSEjMUFCUnFykf/EABUBAQEAAAAAAAAAAAAAAAAAAAAB/8QAFhEBAQEAAAAAAAAAAAAAAAAAACFR/9oADAMBAAIRAxEAPwCRxOV0btsB1e2vAhPNHsEjzCLhTS0/VDk7yE+qT1S6kf/Z",
  },
  {
    src: `${CITIES}/France/annecy/hero.jpeg`,
    key: "annecy",
    city: "Annecy",
    pos: "50% 50%",
    blur: "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAJABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAgT/xAAjEAACAAUCBwAAAAAAAAAAAAABAgADBBESEzMFFCEiMXFy/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAL/xAAYEQADAQEAAAAAAAAAAAAAAAAAAQISIv/aAAwDAQACEQMRAD8AneomDSDtiqkBgrWt08RLUVk/UHNFmOPYS17AwZW0/wBCBxPZl+zETPIdvR//2Q==",
  },
  {
    src: `${CITIES}/Denmark/copenhagen/hero.jpeg`,
    key: "copenhagen",
    city: "Copenhagen",
    pos: "55% 50%",
    blur: "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAJABADASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABAID/8QAHhAAAgIBBQEAAAAAAAAAAAAAAQIAAyEEBRESMnL/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAf/EABgRAAIDAAAAAAAAAAAAAAAAAAARAQMx/9oADAMBAAIRAxEAPwCdRuFSEAqageMuOZibqLmDWN365GMQWq9L9CFX0ZLJnGK1qP/Z",
  },
];

