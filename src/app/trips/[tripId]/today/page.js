import TodayClient from './TodayClient';

export const metadata = {
  title: 'Trip Home',
  robots: { index: false },
};

/**
 * Trip Home — what the installed app IS while you travel: today's plan on top,
 * the Olivier thread below. Private by nature: the shell renders empty and the
 * client loads everything through the authenticated agent API (same pattern as
 * the concierge preview for private trips).
 */
export default async function TodayPage({ params }) {
  const { tripId } = await params;
  return <TodayClient tripId={tripId} />;
}
