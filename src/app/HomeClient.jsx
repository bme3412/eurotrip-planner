"use client";

import { useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTripDates, serializeDates } from "../hooks/useTripDates";
import ScoringDemoSection from "../components/home/ScoringDemoSection";
import RankingReshuffle from "../components/home/RankingReshuffle";
import HowItWorks from "../components/home/HowItWorks";
import HeroWidget from "../components/home/HeroWidget";

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
      {/* Hero Section - Single column, centered */}
      <section className="relative px-6 pt-8 md:pt-12 pb-12 md:pb-16 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200/40 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center text-center animate-fade-in">
          {/* Headline */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.05] text-gray-900 font-bold tracking-tight mb-5">
            Pick your dates. We&apos;ll rank{" "}
            <span className="text-blue-600">220 European cities</span>{" "}
            for them.
          </h1>

          {/* Hero widget — date picker first, natural language second */}
          <div
            ref={dateSelectorRef}
            className="relative w-full max-w-xl animate-fade-in-safe transition-shadow duration-500"
          >
            <div className="relative z-10">
              <HeroWidget
                value={{ start: dates?.start, end: dates?.end }}
                onChange={(next) =>
                  setDates({ mode: "dates", start: next.start, end: next.end })
                }
                onSubmit={submit}
                submitting={isPending}
              />
            </div>
            {/* Background blob */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100/40 to-indigo-100/40 rounded-[2.5rem] -z-0 blur-2xl"></div>
          </div>

          {/* Single freshness / proof line (replaces the repetitive ticker) */}
          <p className="mt-6 text-sm text-gray-500 font-medium">
            Free · No signup · Scoring{" "}
            <span className="font-semibold text-gray-700">220 cities</span> across 41
            countries on weather, crowds &amp; events — updated hourly.
          </p>

          {/* Tertiary: browse all */}
          <Link
            href="/city-guides"
            className="mt-3 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
          >
            Browse all cities
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* Insight → Proof → How it works */}
      <ScoringDemoSection onScrollToDatePicker={scrollToDatePicker} />
      <RankingReshuffle onScrollToDatePicker={scrollToDatePicker} />
      <HowItWorks onScrollToDatePicker={scrollToDatePicker} />

      {/* Footer is now in layout.js */}
    </div>
  );
}
