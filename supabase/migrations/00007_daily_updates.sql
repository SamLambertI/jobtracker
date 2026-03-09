-- Daily updates: end-of-day team communication feed
CREATE TABLE daily_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  done_today text NOT NULL,
  up_next text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_daily_updates_company ON daily_updates(company_id, created_at DESC);
CREATE INDEX idx_daily_updates_team ON daily_updates(team_id, created_at DESC);

-- RLS
ALTER TABLE daily_updates ENABLE ROW LEVEL SECURITY;

-- All company members can read updates from their company
CREATE POLICY "Users can read company updates"
  ON daily_updates FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Any authenticated user can insert their own update
CREATE POLICY "Users can insert own updates"
  ON daily_updates FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can delete their own updates
CREATE POLICY "Users can delete own updates"
  ON daily_updates FOR DELETE
  USING (user_id = auth.uid());
