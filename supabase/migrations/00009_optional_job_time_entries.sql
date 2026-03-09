-- Make job_id optional so users can clock in without allocating a job
ALTER TABLE time_entries ALTER COLUMN job_id DROP NOT NULL;
