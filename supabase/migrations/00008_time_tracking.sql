-- Time tracking: clock in/out with GPS location
CREATE TABLE time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  clock_in_lat double precision,
  clock_in_lng double precision,
  clock_out_lat double precision,
  clock_out_lng double precision,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_time_entries_user ON time_entries(user_id, clock_in DESC);
CREATE INDEX idx_time_entries_company ON time_entries(company_id, clock_in DESC);
CREATE INDEX idx_time_entries_job ON time_entries(job_id);

-- RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Owners/managers can see all company time entries
CREATE POLICY "Owners and managers can view all time entries"
  ON time_entries FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
  );

-- Team leaders can see their own + their team's entries
CREATE POLICY "Team leaders can view team time entries"
  ON time_entries FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'team_leader'
    AND (
      user_id = auth.uid()
      OR user_id IN (
        SELECT id FROM users WHERE team_id = (SELECT team_id FROM users WHERE id = auth.uid())
      )
    )
  );

-- Operatives can see only their own
CREATE POLICY "Users can view own time entries"
  ON time_entries FOR SELECT
  USING (
    user_id = auth.uid()
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'operative'
  );

-- Any authenticated user can clock in (insert their own)
CREATE POLICY "Users can insert own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can update their own entries (for clock out)
CREATE POLICY "Users can update own time entries"
  ON time_entries FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Owners/managers can delete any company entry
CREATE POLICY "Owners and managers can delete time entries"
  ON time_entries FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('owner', 'manager')
  );

-- Users can delete their own entries
CREATE POLICY "Users can delete own time entries"
  ON time_entries FOR DELETE
  USING (user_id = auth.uid());
