-- Persists a discontinued membership journey so the card stays red until the contact is archived.
ALTER TABLE "follow_ups" ADD COLUMN "journeyDiscontinuedAt" TIMESTAMP(3);
