-- Price list items (company-level catalogue)
CREATE TABLE price_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category cost_category NOT NULL DEFAULT 'materials',
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'each',
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_list_company ON price_list_items(company_id);

ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;

-- All company users can read the price list
CREATE POLICY "Users can view own company price list"
  ON price_list_items FOR SELECT
  USING (company_id = auth_company_id());

-- Only owner/manager can manage price list
CREATE POLICY "Owner/manager can insert price list items"
  ON price_list_items FOR INSERT
  WITH CHECK (
    company_id = auth_company_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "Owner/manager can update price list items"
  ON price_list_items FOR UPDATE
  USING (
    company_id = auth_company_id()
    AND auth_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "Owner/manager can delete price list items"
  ON price_list_items FOR DELETE
  USING (
    company_id = auth_company_id()
    AND auth_user_role() IN ('owner', 'manager')
  );
