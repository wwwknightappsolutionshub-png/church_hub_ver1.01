import { ChurchHomeRedirect } from '@/components/marketing/ChurchHomeRedirect';
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
  return (
    <div className="min-h-screen">
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
