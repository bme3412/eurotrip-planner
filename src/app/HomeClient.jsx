"use client";

import { useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTripDates, serializeDates } from "../hooks/useTripDates";
import ScoringDemoSection from "../components/home/ScoringDemoSection";
import ConciergeTeaser from "../components/home/ConciergeTeaser";
import HowItWorks from "../components/home/HowItWorks";
import HeroContent from "../components/home/hero/HeroContent";
import SplitHero from "../components/home/hero/SplitHero";

export default function HomeClient({ initialDates }) {
  const router = useRouter();
  const { dates, setDates } = useTripDates(initialDates);
  const [isPending, startTransition] = useTransition();
  const dateSelectorRef = useRef(null);

  const scrollToDatePicker = useCallback(() => {
    dateSelectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    dateSelectorRef.current?.classList.add("ring-4", "ring-blue-400/60");
    setTimeout(() => {
      dateSelectorRef.current?.classList.remove("ring-4", "ring-blue-400/60");
    }, 2000);
  }, []);

  // Navigate to the Explore map, ranked for the chosen dates. Explore reads the
  // date params on entry and ranks cities with the same V4 engine the old
  // /results scoreboard used, so the map arrives "with context" instead of an
  // ungrouped browse. useTransition gives the button an in-place pending state.
  const submit = useCallback(() => {
    if (!dates?.start || !dates?.end) {
      scrollToDatePicker();
      return;
    }
    startTransition(() => {
      router.push(`/explore?${serializeDates(dates)}`);
    });
  }, [dates, router, scrollToDatePicker]);

  return (
    <div
      className="min-h-screen flex flex-col bg-[#eef4ff]"
      style={{
        // Richer cool-blue mesh (sky / indigo / cyan-teal / periwinkle) — more depth
        // than a flat linear wash, but kept light so the dark hero copy stays legible.
        backgroundImage: [
          "radial-gradient(at 12% 18%, rgba(186,230,253,0.65) 0px, transparent 50%)", // sky-200
          "radial-gradient(at 88% 10%, rgba(199,210,254,0.60) 0px, transparent 48%)", // indigo-200
          "radial-gradient(at 78% 72%, rgba(165,243,252,0.45) 0px, transparent 50%)", // cyan-200
          "radial-gradient(at 22% 82%, rgba(196,181,253,0.40) 0px, transparent 50%)", // violet-200
        ].join(", "),
      }}
    >
      {/* Hero Section — editorial split with a cinematic photo panel */}
      <SplitHero>
        <HeroContent
          dateSelectorRef={dateSelectorRef}
          dates={dates}
          setDates={setDates}
          onSubmit={submit}
          submitting={isPending}
        />
      </SplitHero>

      {/* Hook → Proof → Act → Aspiration */}
      <ScoringDemoSection />
      <HowItWorks onScrollToDatePicker={scrollToDatePicker} />
      <ConciergeTeaser onScrollToDatePicker={scrollToDatePicker} />

      {/* Footer is now in layout.js */}
    </div>
  );
}
