-- CreateTable
CREATE TABLE "church_services" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dayOfWeek" INTEGER,
    "startTime" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "church_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_class_definitions" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_class_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "church_services_churchId_isActive_sortOrder_idx" ON "church_services"("churchId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "church_services_churchId_name_key" ON "church_services"("churchId", "name");

-- CreateIndex
CREATE INDEX "membership_class_definitions_churchId_isActive_sortOrder_idx" ON "membership_class_definitions"("churchId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "membership_class_definitions_churchId_code_key" ON "membership_class_definitions"("churchId", "code");

-- AddForeignKey
ALTER TABLE "church_services" ADD CONSTRAINT "church_services_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_class_definitions" ADD CONSTRAINT "membership_class_definitions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- WhatsApp-only phone channel default for follow-up reminders
ALTER TABLE "follow_up_reminders" ALTER COLUMN "channel" SET DEFAULT 'WHATSAPP';
