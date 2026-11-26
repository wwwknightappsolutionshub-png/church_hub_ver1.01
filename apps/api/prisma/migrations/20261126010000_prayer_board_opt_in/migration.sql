-- Prayer requests opt in to the public board. Existing rows stay board-eligible.
ALTER TABLE "community_hub_posts" ADD COLUMN "showOnBoard" BOOLEAN NOT NULL DEFAULT true;
