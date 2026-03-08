-- Auto-create job_updates entries for status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO job_updates (job_id, user_id, update_type, content)
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.created_by),
      'status_change',
      'Status changed from ' || OLD.status || ' to ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_status_change
AFTER UPDATE ON jobs
FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- Auto-create job_updates entries when actual costs are logged
CREATE OR REPLACE FUNCTION log_cost_added()
RETURNS trigger AS $$
BEGIN
  INSERT INTO job_updates (job_id, user_id, update_type, content)
  VALUES (
    NEW.job_id,
    NEW.logged_by,
    'cost_logged',
    NEW.category || ': ' || NEW.description || ' — £' || TRIM(TO_CHAR(NEW.quantity * NEW.unit_cost, '999,999,990.99'))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_cost_added
AFTER INSERT ON actual_costs
FOR EACH ROW EXECUTE FUNCTION log_cost_added();
