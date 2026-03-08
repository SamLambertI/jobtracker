-- Invites table for user invitations
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'operative',
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_company ON invites(company_id);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view invites in own company"
  ON invites FOR SELECT
  USING (company_id = auth_company_id() AND auth_user_role() = 'owner');

CREATE POLICY "Owners can manage invites in own company"
  ON invites FOR ALL
  USING (company_id = auth_company_id() AND auth_user_role() = 'owner');

-- Function to accept an invite during signup
CREATE OR REPLACE FUNCTION handle_invite_signup(
  invite_token uuid,
  user_id uuid,
  user_name text,
  user_password text -- unused, kept for signature compat
)
RETURNS void AS $$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv FROM invites
  WHERE token = invite_token AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- Create user profile with role and team from invite
  INSERT INTO users (id, company_id, name, email, role, team_id)
  VALUES (inv.user_id, inv.company_id, user_name, inv.email, inv.role, inv.team_id)
  ON CONFLICT (id) DO UPDATE SET
    company_id = inv.company_id,
    name = user_name,
    role = inv.role,
    team_id = inv.team_id;

  -- Mark invite as accepted
  UPDATE invites SET accepted_at = now() WHERE id = inv.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated signup handler to also check for pending invites
CREATE OR REPLACE FUNCTION handle_invite_accept(
  invite_token uuid,
  user_id uuid,
  user_name text
)
RETURNS void AS $$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv FROM invites
  WHERE token = invite_token AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  -- Create user profile with role and team from invite
  INSERT INTO users (id, company_id, name, email, role, team_id)
  VALUES (user_id, inv.company_id, user_name, inv.email, inv.role, inv.team_id);

  -- Mark invite as accepted
  UPDATE invites SET accepted_at = now() WHERE id = inv.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to look up invite by token (no auth required, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_invite_by_token(invite_token uuid)
RETURNS TABLE(id uuid, email text, role user_role, company_name text) AS $$
  SELECT i.id, i.email, i.role, c.name as company_name
  FROM invites i
  JOIN companies c ON c.id = i.company_id
  WHERE i.token = invite_token AND i.accepted_at IS NULL;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
