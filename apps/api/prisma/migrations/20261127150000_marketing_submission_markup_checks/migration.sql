-- Reject HTML entities in stored contact text, and cap internal notes.

ALTER TABLE "platform_marketing_submissions"
  ADD CONSTRAINT "platform_marketing_submissions_entity_check"
  CHECK (
    "name" !~* '&(lt|gt|#)'
    AND "email" !~* '&(lt|gt|#)'
    AND ("organization" IS NULL OR "organization" !~* '&(lt|gt|#)')
    AND ("subject" IS NULL OR "subject" !~* '&(lt|gt|#)')
    AND "message" !~* '&(lt|gt|#)'
  );

ALTER TABLE "platform_marketing_submissions"
  ADD CONSTRAINT "platform_marketing_submissions_notes_check"
  CHECK (
    "internalNotes" IS NULL
    OR (
      char_length("internalNotes") BETWEEN 1 AND 2000
      AND "internalNotes" !~ '[<>]'
      AND "internalNotes" !~* '&(lt|gt|#)'
    )
  );
