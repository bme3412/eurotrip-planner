"use client";

import { useRef, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTripDates, serializeDates } from "../hooks/useTripDates";
import ScoringDemoSection from "../components/home/ScoringDemoSection";
import RankingReshuffle from "../components/home/RankingReshuffle";
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

  // Navigate to the server-ranked /results route. A direct callback replaces the
  // old window CustomEvent handoff (which was silently dropped if the listener
  // wasn't attached) and useTransition gives the button an in-place pending state
  // while the next route streams in.
  const submit = useCallback(() => {
    if (!dates?.start || !dates?.end) {
      scrollToDatePicker();
      return;
    }
    startTransition(() => {
      router.push(`/results?${serializeDates(dates)}`);
    });
  }, [dates, router, scrollToDatePicker]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50">
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

      {/* Insight → Proof → How it works */}
      <ScoringDemoSection onScrollToDatePicker={scrollToDatePicker} />
      <RankingReshuffle onScrollToDatePicker={scrollToDatePicker} />
      <HowItWorks onScrollToDatePicker={scrollToDatePicker} />

      {/* Footer is now in layout.js */}
    </div>
  );
}
