import { Bell, Mail, MessageCircle, Moon, Volume2, Check } from 'lucide-react';

/**
 * "What you'd actually get" — the service shape around the messages: channels,
 * trust controls (quiet hours / tone), and a soft tier teaser. Static preview UI.
 */
const CHANNELS = [
  { icon: Bell, label: 'Push', note: 'the morning nudge, on your lock screen' },
  { icon: Mail, label: 'Email', note: 'the evening brief, beautifully laid out' },
  { icon: MessageCircle, label: 'In-app', note: 'a thread you can reply to, anytime' },
];

export default function ServicePreview({ cadence }) {
  return (
    <div className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm md:p-8">
      <h3 className="font-display text-2xl font-bold text-gray-900">What you’d actually get</h3>
      <p className="mt-2 text-gray-600">
        {cadence?.totalTouches ? `About ${cadence.totalTouches} quiet messages across your trip` : 'A quiet rhythm of messages'}
        {cadence?.timezone ? `, always in ${cadence.timezone}` : ''} — on the channels you choose, never more than you want.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {CHANNELS.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <c.icon className="h-5 w-5 text-blue-500" />
            <p className="mt-2 font-semibold text-gray-900">{c.label}</p>
            <p className="text-xs leading-snug text-gray-500">{c.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
          <Moon className="h-5 w-5 shrink-0 text-indigo-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Quiet hours, respected</p>
            <p className="text-xs text-gray-500">Nothing between 9:30pm and your wake-up — unless it’s trip-breaking.</p>
          </div>
          <span className="ml-auto inline-flex h-6 w-10 items-center rounded-full bg-blue-500 px-0.5">
            <span className="ml-auto h-5 w-5 rounded-full bg-white shadow" />
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
          <Volume2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">Your tone</p>
            <p className="text-xs text-gray-500">Warm and chatty, or just the essentials. You set it once.</p>
          </div>
          <span className="ml-auto inline-flex h-6 w-10 items-center rounded-full bg-blue-500 px-0.5">
            <span className="ml-auto h-5 w-5 rounded-full bg-white shadow" />
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-gray-900">This preview is free.</p>
          <p className="text-sm text-gray-600">The live travel agent — every day of every trip — is the early-access tier.</p>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-gray-600">
          {['Daily briefs', 'Reactive alerts', 'Reply anytime', 'Post-trip recap'].map((f) => (
            <li key={f} className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-blue-500" /> {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
