-- Bound public contact and feedback text, and reject markup at the database.

ALTER TABLE "platform_marketing_submissions"
  ALTER COLUMN "name" TYPE VARCHAR(80),
  ALTER COLUMN "email" TYPE VARCHAR(254),
  ALTER COLUMN "organization" TYPE VARCHAR(120),
  ALTER COLUMN "subject" TYPE VARCHAR(120),
  ALTER COLUMN "message" TYPE VARCHAR(4000);

ALTER TABLE "platform_marketing_submissions"
  ADD CONSTRAINT "platform_marketing_submissions_input_check"
  CHECK (
    char_length(btrim("name")) BETWEEN 2 AND 80
    AND "name" !~ '[<>]'
    AND "name" !~ '[[:cntrl:]]'
    AND char_length("email") BETWEEN 6 AND 254
    AND "email" ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
    AND "email" !~ '[[:cntrl:]]'
    AND (
      "organization" IS NULL
      OR (
        char_length(btrim("organization")) BETWEEN 2 AND 120
        AND "organization" !~ '[<>]'
        AND "organization" !~ '[[:cntrl:]]'
      )
    )
    AND (
      "subject" IS NULL
      OR (
        char_length(btrim("subject")) BETWEEN 2 AND 120
        AND "subject" !~ '[<>]'
        AND "subject" !~ '[[:cntrl:]]'
      )
    )
    AND char_length(btrim("message")) BETWEEN 10 AND 4000
    AND "message" !~ '[<>]'
    AND "message" !~ E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]'
    AND ("rating" IS NULL OR "rating" BETWEEN 1 AND 5)
    AND ("type" <> 'CONTACT' OR "subject" IS NOT NULL)
    AND ("type" <> 'CONTACT' OR "rating" IS NULL)
  );
