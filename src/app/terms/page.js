export const metadata = {
  title: 'Terms of Service',
  description: 'Terms for using EuroTrip Planner.',
};

const CONTACT = 'erhardbr@gmail.com';

/* Beta-grade terms: short, honest about early-access status. Revisit before
   any paid launch. */
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-400">Last updated June 9, 2026</p>

      <div className="mt-8 max-w-none text-[15px] leading-relaxed text-gray-600 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_p]:mt-3">
        <h2>The service</h2>
        <p>
          EuroTrip Planner helps you plan European trips and, in early access, provides &ldquo;Olivier&rdquo; — an
          AI travel agent that sends daily messages about your itinerary. The service is currently free and
          in beta: features may change, pause, or end, and early access can be granted or withdrawn at our
          discretion.
        </p>

        <h2>Travel information is advisory</h2>
        <p>
          Itineraries, opening hours, weather notes, route suggestions, and everything Olivier writes are
          generated automatically and can be wrong or out of date. Verify anything that matters — bookings,
          tickets, closures, transit — before relying on it. You travel at your own judgment; we&rsquo;re not
          liable for missed reservations, closed doors, or rained-out afternoons.
        </p>

        <h2>Your account</h2>
        <p>
          Keep your sign-in to yourself and use the service only for personal trip planning. We may suspend
          accounts that abuse the service (automated scraping, attempting to circumvent rate limits, or
          generating content unrelated to travel).
        </p>

        <h2>Your content</h2>
        <p>
          Your trips remain yours. You give us permission to process them — including sending itinerary
          context to our AI provider — solely to operate the service, as described in our{' '}
          <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>.
        </p>

        <h2>Liability</h2>
        <p>
          The service is provided &ldquo;as is&rdquo; without warranties. To the maximum extent permitted by law, our
          total liability for any claim related to the service is limited to the amount you paid for it —
          during the free beta, zero.
        </p>

        <h2>Contact</h2>
        <p>
          Questions: <a href={`mailto:${CONTACT}`} className="text-blue-600 underline">{CONTACT}</a>.
        </p>
      </div>
    </div>
  );
}
