-- CreateEnum
CREATE TYPE "Wisdom365VariantSlug" AS ENUM ('BUSINESS_OWNERS', 'STUDENTS', 'YOUTHS', 'KIDS', 'HUSBANDS', 'WIVES');

-- CreateEnum
CREATE TYPE "Wisdom365ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "Wisdom365SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "wisdom365_variants" (
    "id" TEXT NOT NULL,
    "slug" "Wisdom365VariantSlug" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "bibleTranslationLabel" TEXT NOT NULL,
    "bibleTranslationCode" TEXT NOT NULL DEFAULT 'WEB',
    "requiresParentalConsent" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wisdom365_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wisdom365_content_entries" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "dayOfYear" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "passage" TEXT NOT NULL,
    "wisdom" TEXT NOT NULL,
    "application" TEXT NOT NULL,
    "prayer" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "imageUrl" TEXT,
    "audioScriptHint" TEXT,
    "status" "Wisdom365ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wisdom365_content_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wisdom365_product_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "licensePricePence" INTEGER NOT NULL DEFAULT 1000,
    "multiLicenseDiscountPercent" INTEGER NOT NULL DEFAULT 20,
    "multiLicenseMinCount" INTEGER NOT NULL DEFAULT 2,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "subscriptionDurationDays" INTEGER NOT NULL DEFAULT 365,
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wisdom365_product_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wisdom365_church_availability" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wisdom365_church_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wisdom365_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "licenseCount" INTEGER NOT NULL,
    "status" "Wisdom365SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "stripeCheckoutSessionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "amountPaidPence" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wisdom365_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wisdom365_license_assignments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "parentUserId" TEXT,
    "childMemberId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wisdom365_license_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wisdom365_kids_grants" (
    "id" TEXT NOT NULL,
    "parentUserId" TEXT NOT NULL,
    "childMemberId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "childDisplayName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wisdom365_kids_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wisdom365_member_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "journalText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wisdom365_member_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wisdom365_member_prefs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "reminderHour" INTEGER NOT NULL DEFAULT 7,
    "reminderMinute" INTEGER NOT NULL DEFAULT 0,
    "alarmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wisdom365_member_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wisdom365_variants_slug_key" ON "wisdom365_variants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "wisdom365_content_entries_variantId_dayOfYear_key" ON "wisdom365_content_entries"("variantId", "dayOfYear");

-- CreateIndex
CREATE INDEX "wisdom365_content_entries_variantId_status_dayOfYear_idx" ON "wisdom365_content_entries"("variantId", "status", "dayOfYear");

-- CreateIndex
CREATE UNIQUE INDEX "wisdom365_church_availability_churchId_key" ON "wisdom365_church_availability"("churchId");

-- CreateIndex
CREATE UNIQUE INDEX "wisdom365_subscriptions_stripeCheckoutSessionId_key" ON "wisdom365_subscriptions"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "wisdom365_subscriptions_stripeSubscriptionId_key" ON "wisdom365_subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "wisdom365_subscriptions_userId_status_idx" ON "wisdom365_subscriptions"("userId", "status");

-- CreateIndex
CREATE INDEX "wisdom365_subscriptions_churchId_status_idx" ON "wisdom365_subscriptions"("churchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "wisdom365_license_assignments_subscriptionId_variantId_key" ON "wisdom365_license_assignments"("subscriptionId", "variantId");

-- CreateIndex
CREATE INDEX "wisdom365_license_assignments_userId_isActive_idx" ON "wisdom365_license_assignments"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "wisdom365_kids_grants_parentUserId_childMemberId_variantId_key" ON "wisdom365_kids_grants"("parentUserId", "childMemberId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "wisdom365_member_progress_userId_variantId_dateKey_key" ON "wisdom365_member_progress"("userId", "variantId", "dateKey");

-- CreateIndex
CREATE INDEX "wisdom365_member_progress_userId_variantId_idx" ON "wisdom365_member_progress"("userId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "wisdom365_member_prefs_userId_variantId_key" ON "wisdom365_member_prefs"("userId", "variantId");

-- AddForeignKey
ALTER TABLE "wisdom365_content_entries" ADD CONSTRAINT "wisdom365_content_entries_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "wisdom365_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_church_availability" ADD CONSTRAINT "wisdom365_church_availability_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_subscriptions" ADD CONSTRAINT "wisdom365_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_subscriptions" ADD CONSTRAINT "wisdom365_subscriptions_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_license_assignments" ADD CONSTRAINT "wisdom365_license_assignments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "wisdom365_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_license_assignments" ADD CONSTRAINT "wisdom365_license_assignments_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "wisdom365_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_license_assignments" ADD CONSTRAINT "wisdom365_license_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_license_assignments" ADD CONSTRAINT "wisdom365_license_assignments_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_license_assignments" ADD CONSTRAINT "wisdom365_license_assignments_childMemberId_fkey" FOREIGN KEY ("childMemberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_kids_grants" ADD CONSTRAINT "wisdom365_kids_grants_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_kids_grants" ADD CONSTRAINT "wisdom365_kids_grants_childMemberId_fkey" FOREIGN KEY ("childMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_kids_grants" ADD CONSTRAINT "wisdom365_kids_grants_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "wisdom365_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_member_progress" ADD CONSTRAINT "wisdom365_member_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_member_progress" ADD CONSTRAINT "wisdom365_member_progress_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "wisdom365_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_member_prefs" ADD CONSTRAINT "wisdom365_member_prefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wisdom365_member_prefs" ADD CONSTRAINT "wisdom365_member_prefs_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "wisdom365_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
