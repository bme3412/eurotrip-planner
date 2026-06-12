'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { MapPin, Clock, Wallet, PartyPopper, CloudRain, Plane, Utensils, Footprints, BedDouble } from 'lucide-react';
import ActivityImage from './ActivityImage';
import SeasonStrip from './SeasonStrip';
import ArrivalLogistics from './arrival/ArrivalLogistics';
import { tokens, slotMeta, citySegments, fmtDate, cityGradient, ACCENT, FlightBanner, flightLabel, richText } from './shared';

const ItineraryMap = dynamic(
  () => import('@/app/itineraries/[tripId]/ItineraryMap'),
  { ssr: false, loading: () => <div className="h-44 w-full animate-pulse bg-black/20" /> },
);

/** [lng,lat] (GeoJSON) or {latitude,longitude} → {lat,lng} or null. */
function toLatLng(a) {
  if (Array.isArray(a?.coordinates) && a.coordinates.length === 2) {
    return { lng: a.coordinates[0], lat: a.coordinates[1] };
  }
  if (typeof a?.latitude === 'number' && typeof a?.longitude === 'number') {
    return { lat: a.latitude, lng: a.longitude };
  }
  return null;
}

/** Human label for an activity's nextTravel hop, or null when not worth showing. */
function travelLabel(nextTravel) {
  const mins = nextTravel?.durationMinutes;
  if (mins == null || mins < 1) return null;
  const mode = (nextTravel.travelMode || 'WALK').toUpperCase();
  const verb = mode === 'WALK' ? 'walk' : mode === 'BICYCLE' ? 'bike' : mode === 'TRANSIT' ? 'by transit' : 'travel';
  return `${mins} min ${verb} to next stop`;
}

/** Lodging card shown under a city's chapter header. */
function LodgingCard({ a, t }) {
  if (!a || (!a.name && !a.address)) return null;
  const stay = (a.checkIn || a.checkOut)
    ? `${a.checkIn ? `Check-in ${fmtDate(a.checkIn)}` : ''}${a.checkIn && a.checkOut ? ' · ' : ''}${a.checkOut ? `Check-out ${fmtDate(a.checkOut)}` : ''}`
    : null;
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3 ${t.panel}`}>
      <BedDouble className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${t.heading}`}>{a.name || 'Your stay'}</p>
        {a.address && <p className={`text-xs ${t.muted}`}>{a.address}</p>}
        {(stay || a.confirmationNumber) && (
          <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs ${t.muted}`}>
            {stay && <span>{stay}</span>}
            {a.confirmationNumber && <span>Conf. {a.confirmationNumber}</span>}
          </div>
        )}
        {a.notes && <p className={`mt-1 text-xs ${t.muted}`}>{a.notes}</p>}
      </div>
    </div>
  );
}

function Chips({ a, t }) {
  const items = [];
  if (a.duration) items.push([Clock, a.duration]);
  if (a.price && a.price !== 'Free') items.push([Wallet, a.price]);
  if (a.neighborhood) items.push([MapPin, a.neighborhood]);
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map(([Icon, val], i) => (
        <span key={i} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ring-1 ${t.chip}`}>
          <Icon className="h-3 w-3" /> {val}
        </span>
      ))}
      {a.price === 'Free' && (
        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-500/20">Free</span>
      )}
    </div>
  );
}

function ActivityRow({ block, citySlug, cityName, showPhotos, t }) {
  const a = block.activity;
  if (!a) return null;
  const s = slotMeta(block.time);
  const isFood = a.type === 'food_recommendation';
  const ll = toLatLng(a);
  return (
    <div className="relative flex gap-3 pb-5">
      {/* timeline spine */}
      <div className="flex flex-col items-center pt-1.5">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} />
        <span className={`mt-1 w-px flex-1 border-l ${t.border}`} />
      </div>

      {/* thumbnail */}
      {showPhotos && (
        isFood ? (
          <div className={`flex h-14 w-20 shrink-0 items-center justify-center rounded-lg border sm:h-16 sm:w-24 ${t.panelSoft}`}>
            <Utensils className={`h-5 w-5 ${t.muted}`} />
          </div>
        ) : (
          <ActivityImage
            q={`${a.name} ${cityName}`}
            placeId={a.googlePlaceId}
            lat={ll?.lat}
            lng={ll?.lng}
            citySlug={citySlug}
            w={320}
            alt={a.name}
            className="h-14 w-20 shrink-0 rounded-lg sm:h-16 sm:w-24"
          />
        )
      )}

      {/* text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${s.tone}`}>{s.label}</span>
          {block.startTime && <span className={`text-[11px] ${t.muted}`}>{block.startTime}</span>}
        </div>
        <h4 className={`mt-0.5 flex items-center gap-1.5 font-semibold ${t.heading}`}>
          {a.isEvent && <PartyPopper className="h-4 w-4 text-amber-500" />}
          {a.name}
          {a._provenance === 'google_places' && (
            <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${t.chip}`} title="Live suggestion from Google Places — verify hours before you go">
              Suggested
            </span>
          )}
        </h4>
        {a.description && <p className={`mt-1 text-sm leading-relaxed ${t.body}`}>{richText(a.description)}</p>}
        <Chips a={a} t={t} />
        {a.weatherBackup && (
          <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-600 ring-1 ring-sky-500/20">
            <CloudRain className="mt-0.5 h-3 w-3 shrink-0" /> Rain backup: {a.weatherBackup}
          </p>
        )}
        {travelLabel(a.nextTravel) && (
          <p className={`mt-2 inline-flex items-center gap-1 text-[11px] ${t.muted}`}>
            <Footprints className="h-3 w-3 shrink-0" /> {travelLabel(a.nextTravel)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ItineraryView({ itinerary, theme = 'light', showPhotos = true, actions = null, heroImage = null, dayActions = null }) {
  const t = tokens(theme);
  const segs = citySegments(itinerary);
  const cityCount = segs.filter((s) => !s.travel).length;
  const m = itinerary.meta || {};
  const cities = itinerary.cities || [];
  const route = cities.map((c) => c.name).join(' → ');
  const firstCity = cities[0];
  const cityDays = (itinerary.days || []).filter((d) => !d.isTravelDay);

  const markers = useMemo(() => {
    const out = [];
    for (const d of itinerary.days || []) {
      if (d.isTravelDay) continue;
      for (const b of d.timeBlocks || []) {
        const ll = toLatLng(b.activity);
        if (ll) out.push({ lat: ll.lat, lng: ll.lng, name: b.activity.name, dayNum: d.dayNumber, color: ACCENT, timeBlock: b.time });
      }
    }
    return out;
  }, [itinerary]);

  return (
    <div className={`${t.page} min-h-full`}>
      {/* ── Editorial hero ── */}
      <header className="relative">
        <div className="relative h-64 w-full overflow-hidden sm:h-72 md:h-80">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImage} alt={firstCity?.name || 'Trip'} className="absolute inset-0 h-full w-full object-cover" />
          ) : showPhotos && firstCity ? (
            <ActivityImage q={`${firstCity.name} skyline`} citySlug={firstCity.city} w={1600} alt={firstCity.name} className="absolute inset-0 h-full w-full" />
          ) : (
            <div className="absolute inset-0" style={{ background: cityGradient(firstCity?.city) }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-5 pb-5 sm:pb-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/75 sm:text-[11px]">Your trip</p>
            <h1 className="mt-1 text-balance font-display text-2xl font-medium leading-tight text-white sm:text-3xl md:text-4xl lg:text-5xl" style={{ letterSpacing: '-0.01em' }}>{route}</h1>
            <p className="mt-1.5 text-xs text-white/85 sm:mt-2 sm:text-sm">
              {fmtDate(m.startDate)} – {fmtDate(m.endDate)} · {m.totalDays} days · {m.totalCities} {m.totalCities === 1 ? 'city' : 'cities'}
            </p>
            {actions && <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">{actions}</div>}
          </div>
        </div>
      </header>

      {/* ── Mobile day nav (no left rail below lg) ── */}
      {cityDays.length > 1 && (
        <nav className={`sticky top-0 z-10 flex gap-2 overflow-x-auto border-b px-4 py-2.5 lg:hidden ${t.border} ${t.railBg}`}>
          {cityDays.map((d) => (
            <a
              key={d.dayNumber}
              href={`#day-${d.dayNumber}`}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${t.border} ${t.body}`}
            >
              Day {d.dayNumber}
              <span className={`ml-1 font-normal ${t.muted}`}>{d.cityName}</span>
            </a>
          ))}
        </nav>
      )}

      {/* ── Two-pane body ── */}
      <div className="mx-auto flex max-w-6xl gap-8 px-5 py-6 sm:py-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-6 space-y-5">
            <nav className="space-y-0.5">
              {cityDays.map((d) => (
                <a key={d.dayNumber} href={`#day-${d.dayNumber}`} className={`block rounded-lg px-3 py-2 text-sm transition-colors ${t.hover}`}>
                  <span className={`font-semibold ${t.heading}`}>Day {d.dayNumber}</span>
                  <span className={`ml-2 ${t.muted}`}>{d.cityName}</span>
                  <span className={`block truncate text-[11px] ${t.muted}`}>{d.theme}</span>
                </a>
              ))}
            </nav>
            {markers.length > 0 && (
              <div className={`overflow-hidden rounded-xl border ${t.border}`}>
                <ItineraryMap markers={markers} />
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {itinerary.intro && (
            <p className={`mb-6 max-w-2xl font-display text-lg leading-relaxed sm:text-xl ${t.body}`}>
              {itinerary.intro}
            </p>
          )}

          <SeasonStrip itinerary={itinerary} t={t} />

          {itinerary.bookImmediately?.length > 0 && (
            <section className="mb-6 rounded-2xl border px-5 py-4" style={{ borderColor: `${ACCENT}40`, background: `${ACCENT}0f` }}>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Reserve these first</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {itinerary.bookImmediately.map((b) => (
                  <div key={b.title} className={`rounded-xl border p-3 ${t.panel}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${t.muted}`}>{b.type}</p>
                    <p className={`mt-1 text-sm font-semibold ${t.heading}`}>{b.title}</p>
                    <p className={`mt-1 text-xs ${t.muted}`}>{b.note}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {segs.map((seg, i) =>
            seg.travel ? (
              (() => {
                const tr = seg.travel.transfer;
                // Generated trips carry a transfer object; persisted ones may only
                // have the day theme ("✈️ Travel from X to Y") — fall back to that.
                const label = tr?.from?.name && tr?.to?.name
                  ? `${tr.from.name} → ${tr.to.name}`
                  : (seg.travel.theme || 'Travel day').replace(/^✈️\s*/, '');
                // Prefer the user's actual booked flight for this leg.
                const bf = tr?.bookedFlight;
                const sub = bf
                  ? `${flightLabel(bf) || 'Flight'}${bf.departureTime ? ` · ${bf.departureTime}${bf.arrivalTime ? `–${bf.arrivalTime}` : ''}` : ''}`
                  : (tr?.transport ? `${tr.transport.type} · ${tr.transport.journeyTime}` : null);
                return (
                  <div key={`t${i}`} className={`my-4 flex items-center gap-3 rounded-xl border border-dashed ${t.border} ${t.panelSoft} px-4 py-3`}>
                    <Plane className="h-4 w-4" style={{ color: ACCENT }} />
                    <span className={`text-sm font-medium ${t.body}`}>{label}</span>
                    {sub && <span className={`text-xs ${t.muted}`}>{sub}</span>}
                    {bf && <span className="rounded bg-[#1e63e9]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1e63e9]">Your flight</span>}
                  </div>
                );
              })()
            ) : (
              <section key={`c${i}`}>
                {/* City chapter header — only when the trip spans more than one city. */}
                {cityCount > 1 && (
                  <header className={`mb-3 mt-2 flex items-baseline gap-2 border-b pb-2 ${t.border}`}>
                    <h2 className={`font-display text-xl font-medium ${t.heading}`}>{seg.city}</h2>
                    {seg.country && <span className={`text-sm ${t.muted}`}>{seg.country}</span>}
                    <span className={`ml-auto text-xs ${t.muted}`}>
                      Days {seg.days[0].dayNumber}&ndash;{seg.days[seg.days.length - 1].dayNumber}
                    </span>
                  </header>
                )}
                <LodgingCard a={seg.days.find((d) => d.accommodation)?.accommodation} t={t} />
                {seg.days.map((d) => (
                  <article
                    key={d.dayNumber}
                    id={`day-${d.dayNumber}`}
                    className={`mb-4 scroll-mt-20 rounded-2xl border ${t.panel} p-4 sm:p-5 lg:scroll-mt-6 animate-fade-in`}
                    style={{ animationDelay: `${Math.min((d.dayNumber || 1) * 50, 400)}ms`, animationFillMode: 'both' }}
                  >
                    <header className={`mb-4 border-b ${t.border} pb-3`}>
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-display text-3xl font-medium" style={{ color: ACCENT }}>{d.dayNumber}</span>
                        <div>
                          <h3 className={`font-semibold ${t.heading}`}>{d.theme}</h3>
                          <p className={`text-xs ${t.muted}`}>{d.dateLabel} · {d.cityName}</p>
                        </div>
                        {dayActions && <div className="ml-auto self-start">{dayActions(d)}</div>}
                      </div>
                      {d.weatherNote && (
                        <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ring-1 ${t.chip}`}>{d.weatherNote}</p>
                      )}
                      {d.summary && <p className={`mt-2 text-sm leading-relaxed ${t.body}`}>{d.summary}</p>}
                      {d.departure && (
                        <div><FlightBanner kind="departure" booking={d.departure} accommodationName={seg.days.find((x) => x.accommodation)?.accommodation?.name} /></div>
                      )}
                    </header>
                    {/* Arrival logistics: how to get from the airport to the lodging. Reads
                        first so the day flows "get to your stay, then explore." */}
                    {d.arrival && (
                      <ArrivalLogistics
                        arrival={d.arrival}
                        citySlug={d.city}
                        cityName={d.cityName}
                        accommodation={seg.days.find((x) => x.accommodation)?.accommodation}
                        t={t}
                      />
                    )}
                    <div>
                      {d.timeBlocks.map((b, bi) => (
                        <ActivityRow key={bi} block={b} citySlug={d.city} cityName={d.cityName} showPhotos={showPhotos} t={t} />
                      ))}
                    </div>
                  </article>
                ))}
              </section>
            )
          )}
        </main>
      </div>
    </div>
  );
}
