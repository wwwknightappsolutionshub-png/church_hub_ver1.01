-- Provincial layer for Ministry/Cells: provinces, coverage postcodes, branch postcode + provinceId

CREATE TABLE "cell_provinces" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cell_provinces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cell_province_postcodes" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "postcodeNormalized" TEXT NOT NULL,

    CONSTRAINT "cell_province_postcodes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cell_provinces_churchId_name_key" ON "cell_provinces"("churchId", "name");
CREATE UNIQUE INDEX "cell_provinces_churchId_leaderUserId_key" ON "cell_provinces"("churchId", "leaderUserId");
CREATE INDEX "cell_provinces_churchId_idx" ON "cell_provinces"("churchId");

CREATE UNIQUE INDEX "cell_province_postcodes_churchId_postcodeNormalized_key" ON "cell_province_postcodes"("churchId", "postcodeNormalized");
CREATE INDEX "cell_province_postcodes_provinceId_idx" ON "cell_province_postcodes"("provinceId");

ALTER TABLE "cell_provinces" ADD CONSTRAINT "cell_provinces_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_provinces" ADD CONSTRAINT "cell_provinces_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cell_province_postcodes" ADD CONSTRAINT "cell_province_postcodes_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "cell_provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cell_branches" ADD COLUMN "postcode" TEXT;
ALTER TABLE "cell_branches" ADD COLUMN "provinceId" TEXT;

CREATE INDEX "cell_branches_churchId_provinceId_idx" ON "cell_branches"("churchId", "provinceId");
CREATE INDEX "cell_branches_churchId_postcode_idx" ON "cell_branches"("churchId", "postcode");

ALTER TABLE "cell_branches" ADD CONSTRAINT "cell_branches_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "cell_provinces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
