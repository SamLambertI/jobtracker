-- Creates company + user record in a single transaction during signup.
-- SECURITY DEFINER bypasses RLS so the first user (owner) can be created.
CREATE OR REPLACE FUNCTION handle_new_signup(
  user_id uuid,
  user_name text,
  user_email text,
  company_name text
)
RETURNS void AS $$
DECLARE
  new_company_id uuid;
BEGIN
  -- Create the company
  INSERT INTO companies (name)
  VALUES (company_name)
  RETURNING id INTO new_company_id;

  -- Create the user profile as owner
  INSERT INTO users (id, company_id, name, email, role)
  VALUES (user_id, new_company_id, user_name, user_email, 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
