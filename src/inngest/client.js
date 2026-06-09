import { Inngest } from 'inngest';

// One Inngest client for the app. Event keys/signing keys come from the
// environment in production (INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY); local dev
// works against the Inngest dev server with no keys.
export const inngest = new Inngest({ id: 'eurotrip-planner' });
