-- ============================================================================
-- Job Profitability Tracker — Initial Schema Migration
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom ENUM types
-- ---------------------------------------------------------------------------
CREATE TYPE plan_tier AS ENUM ('starter', 'growth', 'pro');
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'team_leader', 'operative');
CREATE TYPE job_status AS ENUM ('quoted', 'booked', 'in_progress', 'complete', 'invoiced');
CREATE TYPE cost_category AS ENUM ('labour', 'materials', 'plant_hire', 'waste', 'other');
CREATE TYPE update_type AS ENUM ('photo', 'note', 'status_change', 'cost_logged', 'daily_checkin');

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

-- companies
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  plan_tier plan_tier NOT NULL DEFAULT 'starter',
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- teams (created before users so users can reference teams)
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  leader_id uuid, -- FK added after users table exists
  created_at timestamptz NOT NULL DEFAULT now()
);

-- users (public profile table linked to auth.users)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'operative',
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- now add the deferred FK from teams.leader_id → users.id
ALTER TABLE teams
  ADD CONSTRAINT teams_leader_id_fkey
  FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE SET NULL;

-- jobs
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_address text,
  client_email text,
  client_phone text,
  description text NOT NULL,
  status job_status NOT NULL DEFAULT 'quoted',
  start_date date,
  end_date date,
  quoted_total numeric NOT NULL DEFAULT 0,
  actual_total numeric NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- quoted_costs
CREATE TABLE quoted_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  category cost_category NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'each',
  unit_cost numeric NOT NULL DEFAULT 0,
  line_total numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- actual_costs
CREATE TABLE actual_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  category cost_category NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'each',
  unit_cost numeric NOT NULL DEFAULT 0,
  line_total numeric GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  logged_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  receipt_photo_url text,
  logged_at timestamptz NOT NULL DEFAULT now()
);

-- job_updates
CREATE TABLE job_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  update_type update_type NOT NULL,
  content text,
  photo_urls text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- photos
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  storage_path text NOT NULL,
  url text NOT NULL,
  caption text,
  taken_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_team ON users(team_id);
CREATE INDEX idx_teams_company ON teams(company_id);
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_team ON jobs(team_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_quoted_costs_job ON quoted_costs(job_id);
CREATE INDEX idx_actual_costs_job ON actual_costs(job_id);
CREATE INDEX idx_job_updates_job ON job_updates(job_id);
CREATE INDEX idx_photos_job ON photos(job_id);

-- ---------------------------------------------------------------------------
-- 4. Functions — keep quoted_total / actual_total in sync
-- ---------------------------------------------------------------------------

-- Recompute jobs.quoted_total from quoted_costs
CREATE OR REPLACE FUNCTION update_quoted_total()
RETURNS trigger AS $$
BEGIN
  UPDATE jobs
  SET quoted_total = COALESCE((
    SELECT SUM(quantity * unit_cost) FROM quoted_costs WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
  ), 0),
  updated_at = now()
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_quoted_costs_sync
AFTER INSERT OR UPDATE OR DELETE ON quoted_costs
FOR EACH ROW EXECUTE FUNCTION update_quoted_total();

-- Recompute jobs.actual_total from actual_costs
CREATE OR REPLACE FUNCTION update_actual_total()
RETURNS trigger AS $$
BEGIN
  UPDATE jobs
  SET actual_total = COALESCE((
    SELECT SUM(quantity * unit_cost) FROM actual_costs WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
  ), 0),
  updated_at = now()
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_actual_costs_sync
AFTER INSERT OR UPDATE OR DELETE ON actual_costs
FOR EACH ROW EXECUTE FUNCTION update_actual_total();

-- ---------------------------------------------------------------------------
-- 5. Updated_at trigger for jobs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quoted_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Helper: get the current user's company_id
CREATE OR REPLACE FUNCTION auth_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get the current user's role
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get the current user's team_id
CREATE OR REPLACE FUNCTION auth_team_id()
RETURNS uuid AS $$
  SELECT team_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---- companies ----
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (id = auth_company_id());

CREATE POLICY "Owners can update own company"
  ON companies FOR UPDATE
  USING (id = auth_company_id() AND auth_user_role() = 'owner');

-- ---- users ----
CREATE POLICY "Users can view colleagues in same company"
  ON users FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Owners can insert users into own company"
  ON users FOR INSERT
  WITH CHECK (company_id = auth_company_id() AND auth_user_role() = 'owner');

CREATE POLICY "Owners can delete users in own company"
  ON users FOR DELETE
  USING (company_id = auth_company_id() AND auth_user_role() = 'owner');

-- ---- teams ----
CREATE POLICY "Users can view teams in own company"
  ON teams FOR SELECT
  USING (company_id = auth_company_id());

CREATE POLICY "Owners and managers can manage teams"
  ON teams FOR ALL
  USING (company_id = auth_company_id() AND auth_user_role() IN ('owner', 'manager'));

-- ---- jobs ----
-- Owners & managers see all company jobs; team_leader & operative see only their team's jobs
CREATE POLICY "Company members can view jobs"
  ON jobs FOR SELECT
  USING (
    company_id = auth_company_id()
    AND (
      auth_user_role() IN ('owner', 'manager')
      OR team_id = auth_team_id()
    )
  );

CREATE POLICY "Owners and managers can create jobs"
  ON jobs FOR INSERT
  WITH CHECK (
    company_id = auth_company_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "Owners, managers, and team leaders can update jobs"
  ON jobs FOR UPDATE
  USING (
    company_id = auth_company_id()
    AND (
      auth_user_role() IN ('owner', 'manager')
      OR (auth_user_role() = 'team_leader' AND team_id = auth_team_id())
    )
  );

CREATE POLICY "Owners can delete jobs"
  ON jobs FOR DELETE
  USING (company_id = auth_company_id() AND auth_user_role() = 'owner');

-- ---- quoted_costs ----
-- Operatives cannot see quoted costs (financial data restricted)
CREATE POLICY "Non-operatives can view quoted costs"
  ON quoted_costs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = quoted_costs.job_id
        AND jobs.company_id = auth_company_id()
        AND auth_user_role() != 'operative'
        AND (
          auth_user_role() IN ('owner', 'manager')
          OR jobs.team_id = auth_team_id()
        )
    )
  );

CREATE POLICY "Owners and managers can manage quoted costs"
  ON quoted_costs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = quoted_costs.job_id
        AND jobs.company_id = auth_company_id()
        AND auth_user_role() IN ('owner', 'manager')
    )
  );

-- ---- actual_costs ----
-- Operatives cannot see actual costs (financial data restricted)
CREATE POLICY "Non-operatives can view actual costs"
  ON actual_costs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = actual_costs.job_id
        AND jobs.company_id = auth_company_id()
        AND auth_user_role() != 'operative'
        AND (
          auth_user_role() IN ('owner', 'manager')
          OR jobs.team_id = auth_team_id()
        )
    )
  );

CREATE POLICY "Owners, managers, team leaders can manage actual costs"
  ON actual_costs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = actual_costs.job_id
        AND jobs.company_id = auth_company_id()
        AND auth_user_role() IN ('owner', 'manager', 'team_leader')
        AND (
          auth_user_role() IN ('owner', 'manager')
          OR jobs.team_id = auth_team_id()
        )
    )
  );

-- ---- job_updates ----
CREATE POLICY "Company members can view job updates"
  ON job_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_updates.job_id
        AND jobs.company_id = auth_company_id()
        AND (
          auth_user_role() IN ('owner', 'manager')
          OR jobs.team_id = auth_team_id()
        )
    )
  );

CREATE POLICY "Authenticated users can insert job updates"
  ON job_updates FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_updates.job_id
        AND jobs.company_id = auth_company_id()
        AND (
          auth_user_role() IN ('owner', 'manager')
          OR jobs.team_id = auth_team_id()
        )
    )
  );

-- ---- photos ----
CREATE POLICY "Company members can view photos"
  ON photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = photos.job_id
        AND jobs.company_id = auth_company_id()
        AND (
          auth_user_role() IN ('owner', 'manager')
          OR jobs.team_id = auth_team_id()
        )
    )
  );

CREATE POLICY "Authenticated users can upload photos"
  ON photos FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = photos.job_id
        AND jobs.company_id = auth_company_id()
        AND (
          auth_user_role() IN ('owner', 'manager')
          OR jobs.team_id = auth_team_id()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Storage bucket for job photos
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their company's folder
CREATE POLICY "Authenticated users can upload job photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can view job photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-photos'
    AND auth.role() = 'authenticated'
  );
