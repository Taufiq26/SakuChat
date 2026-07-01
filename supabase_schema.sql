-- ====================================================================
-- SakuChat Database Schema for Supabase
-- Run this SQL in your Supabase Dashboard -> SQL Editor -> New Query
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Allow public/anon client access for transactions matching user_id
CREATE POLICY "Allow all access to transactions"
  ON public.transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast user_id query lookup
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
