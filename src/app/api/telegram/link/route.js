import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getRequesterFromAuthHeader } from '@/lib/supabase/requestAuth';
import { isInvited } from '@/lib/concierge/invites';
import { makeLinkToken, telegramConfigured } from '@/lib/concierge/telegram';

export const runtime = 'nodejs';

/**
 * GET /api/telegram/link
 * Signed t.me deep link for the signed-in user. Tapping it opens the bot with
 * /start <code>; the webhook verifies the code and stores the chat id.
 */
export async function GET(request) {
  const { requester, response } = await getRequesterFromAuthHeader(request);
  if (response) return response;

  const invited = await isInvited({
    supabase: await getSupabaseAdmin(),
    email: requester.userEmail,
    userId: requester.userId,
  });
  if (!invited) {
    return NextResponse.json({ error: 'Early access required.', code: 'not_invited' }, { status: 403 });
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (!telegramConfigured() || !botUsername) {
    return NextResponse.json({ error: 'Telegram isn’t configured on this deployment.', code: 'unconfigured' }, { status: 503 });
  }

  const token = makeLinkToken(requester.userId);
  if (!token) return NextResponse.json({ error: 'Could not create a link code.' }, { status: 500 });

  return NextResponse.json({ url: `https://t.me/${botUsername}?start=${token}` });
}
