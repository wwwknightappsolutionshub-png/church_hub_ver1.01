-- WSF / Ministry-Cells Assistant & Secretary deputies (operational access, no primary assign)
CREATE TABLE "cell_leadership_deputies" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "branchId" TEXT,
    "provinceId" TEXT,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cell_leadership_deputies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cell_leadership_deputies_branchId_role_key" ON "cell_leadership_deputies"("branchId", "role");
CREATE UNIQUE INDEX "cell_leadership_deputies_provinceId_role_key" ON "cell_leadership_deputies"("provinceId", "role");
CREATE INDEX "cell_leadership_deputies_churchId_userId_idx" ON "cell_leadership_deputies"("churchId", "userId");
CREATE INDEX "cell_leadership_deputies_branchId_idx" ON "cell_leadership_deputies"("branchId");
CREATE INDEX "cell_leadership_deputies_provinceId_idx" ON "cell_leadership_deputies"("provinceId");

ALTER TABLE "cell_leadership_deputies" ADD CONSTRAINT "cell_leadership_deputies_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_leadership_deputies" ADD CONSTRAINT "cell_leadership_deputies_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "cell_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_leadership_deputies" ADD CONSTRAINT "cell_leadership_deputies_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "cell_provinces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cell_leadership_deputies" ADD CONSTRAINT "cell_leadership_deputies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
