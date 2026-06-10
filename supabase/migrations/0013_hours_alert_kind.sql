-- Migration: 'hours_alert' message/notification kind (T3 closure watcher)
-- Prerequisites: 0008 (notifications), 0012 (thread)
--
-- The night-before opening-hours check is a distinct beat from the weather
-- reactive — both can fire for the same day, so it needs its own kind/type
-- (the idempotency keys are per (…, day, kind)).

ALTER TABLE public.concierge_notifications
  DROP CONSTRAINT IF EXISTS concierge_notifications_type_check;
ALTER TABLE public.concierge_notifications
  ADD CONSTRAINT concierge_notifications_type_check
  CHECK (type IN ('evening_brief', 'morning_wakeup', 'wind_down', 'reactive', 'hours_alert'));

ALTER TABLE public.concierge_messages
  DROP CONSTRAINT IF EXISTS concierge_messages_kind_check;
ALTER TABLE public.concierge_messages
  ADD CONSTRAINT concierge_messages_kind_check
  CHECK (kind IN ('chat', 'evening_brief', 'morning_wakeup', 'wind_down', 'reactive', 'hours_alert', 'action', 'system'));

-- Beat dedup index must cover the new kind.
DROP INDEX IF EXISTS idx_concierge_messages_beat_dedup;
CREATE UNIQUE INDEX IF NOT EXISTS idx_concierge_messages_beat_dedup
  ON public.concierge_messages (thread_id, day_number, kind)
  WHERE kind IN ('evening_brief', 'morning_wakeup', 'wind_down', 'reactive', 'hours_alert');
