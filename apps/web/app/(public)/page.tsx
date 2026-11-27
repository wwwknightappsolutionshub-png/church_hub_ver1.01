import { ChurchHomeRedirect } from '@/components/marketing/ChurchHomeRedirect';
import { MARKETING_DESCRIPTION, MARKETING_TITLE } from '@/lib/marketing-seo';
import { getSiteUrl } from '@/lib/site-url';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { HeroSection } from '@/components/marketing/HeroSection';
import { StatsStrip } from '@/components/marketing/StatsStrip';
import { WhyChurchesSection } from '@/components/marketing/WhyChurchesSection';
import { FeaturesGrid } from '@/components/marketing/FeaturesGrid';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { SecuritySection } from '@/components/marketing/SecuritySection';
import { CTASection } from '@/components/marketing/CTASection';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingTrialModal } from '@/components/marketing/MarketingTrialModal';

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Church_Hub',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: getSiteUrl(),
    description: MARKETING_DESCRIPTION,
    alternateName: MARKETING_TITLE,
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ChurchHomeRedirect />
      <MarketingHeader />
      <main>
        <HeroSection />
        <StatsStrip />
        <WhyChurchesSection />
        <FeaturesGrid />
        <HowItWorks />
        <SecuritySection />
        <CTASection />
      </main>
      <MarketingFooter />
      <MarketingTrialModal />
    </div>
  );
}
