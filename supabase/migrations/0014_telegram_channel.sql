-- Migration: Telegram channel link (T4)
-- Prerequisite: 0008_concierge_notifications.sql (concierge_preferences)
--
-- One Telegram chat per user. Linked via a signed deep-link code
-- (/api/telegram/link → t.me/<bot>?start=<code> → webhook verifies and writes
-- the chat id). Beats mirror to the chat; replies run the same agent runtime.

ALTER TABLE public.concierge_preferences
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
  ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_concierge_prefs_telegram
  ON public.concierge_preferences (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;
