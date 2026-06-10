export const metadata = {
  title: 'Privacy Policy',
  description: 'How EuroTrip Planner handles your data.',
};

const CONTACT = 'erhardbr@gmail.com';

/* Beta-grade policy: plain-language and honest about exactly what the app
   stores and which processors touch it. Revisit before any paid launch. */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-400">Last updated June 9, 2026</p>

      <div className="prose prose-gray mt-8 max-w-none text-[15px] leading-relaxed text-gray-600 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-gray-900 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1 [&_p]:mt-3">
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account:</strong> your email address and sign-in identity (via Supabase Auth, including Google sign-in if you use it).</li>
          <li><strong>Trips:</strong> the cities, dates, interests, and itineraries you create.</li>
          <li><strong>Travel-agent messages:</strong> the briefs Olivier generates for your trips, your notification preferences, and — if you enable push — a push subscription token for each device.</li>
          <li><strong>Waitlist:</strong> the email address and channel preferences you submit when joining early access.</li>
          <li><strong>Usage:</strong> anonymous web analytics (Vercel Analytics) and operational logs, including LLM token counts per generated brief.</li>
        </ul>

        <h2>How we use it</h2>
        <p>
          To plan your trips and run the travel-agent service: generating daily briefs, timing them to your
          itinerary, and delivering them in-app, by push, and by email. Your itinerary details are sent to
          Anthropic&rsquo;s Claude API to write the briefs; weather lookups go to OpenWeatherMap; places and
          maps data come from Google and Mapbox. We don&rsquo;t sell your data or use it for advertising.
        </p>

        <h2>Who processes it</h2>
        <ul>
          <li><strong>Supabase</strong> — database and authentication</li>
          <li><strong>Vercel</strong> — hosting and analytics</li>
          <li><strong>Anthropic</strong> — brief generation (itinerary context only, no account credentials)</li>
          <li><strong>Resend</strong> — email delivery</li>
          <li><strong>Inngest</strong> — message scheduling</li>
          <li><strong>Google, Mapbox, OpenWeatherMap</strong> — places, maps, and weather data</li>
        </ul>

        <h2>Your choices</h2>
        <ul>
          <li>Every brief email includes a one-click unsubscribe link; push can be revoked in your browser or device settings.</li>
          <li>Turning Olivier off for a trip stops all messages for it.</li>
          <li>Email <a href={`mailto:${CONTACT}`} className="text-blue-600 underline">{CONTACT}</a> to access or delete your account and data — we&rsquo;ll complete deletion within 30 days.</li>
        </ul>

        <h2>Retention &amp; security</h2>
        <p>
          Trip and account data is kept while your account exists. Generated briefs are cached for up to
          7 days. Data is stored in Supabase-managed PostgreSQL with row-level security; API keys and
          secrets never leave the server.
        </p>

        <h2>Contact</h2>
        <p>
          Questions or requests: <a href={`mailto:${CONTACT}`} className="text-blue-600 underline">{CONTACT}</a>.
        </p>
      </div>
    </div>
  );
}
