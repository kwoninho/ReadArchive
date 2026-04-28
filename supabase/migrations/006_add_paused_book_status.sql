-- Add "paused reading" as a valid book status.
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_status_check;

ALTER TABLE books
  ADD CONSTRAINT books_status_check
  CHECK (status IN ('WANT_TO_READ', 'READING', 'PAUSED', 'FINISHED'));
