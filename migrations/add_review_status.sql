ALTER TABLE questions
  ADD COLUMN reviewStatus VARCHAR(20) NOT NULL DEFAULT 'draft'
  COMMENT 'draft = pending review, approved = accepted, rejected = sent back'
  AFTER `status`;
