import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class Wisdom365StripeService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = this.config.get<string>('STRIPE_SECRET_KEY');
    if (secret?.startsWith('sk_')) {
      this.stripe = new Stripe(secret, { apiVersion: '2025-02-24.acacia' });
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  async calculateTotal(licenseCount: number) {
    const config = await this.prisma.wisdom365ProductConfig.findUnique({
      where: { id: 'default' },
    });
    const unit = config?.licensePricePence ?? 1000;
    const minCount = config?.multiLicenseMinCount ?? 2;
    const discountPct = config?.multiLicenseDiscountPercent ?? 20;
    const subtotal = unit * licenseCount;
    const discountPence =
      licenseCount >= minCount ? Math.round(subtotal * (discountPct / 100)) : 0;
    return {
      licenseCount,
      unitPricePence: unit,
      subtotalPence: subtotal,
      discountPercent: licenseCount >= minCount ? discountPct : 0,
      discountPence,
      totalPence: subtotal - discountPence,
      currency: config?.currency ?? 'GBP',
    };
  }

  async createCheckoutSession(opts: {
    userId: string;
    churchId: string;
    email: string;
    licenseCount: number;
    subscriptionId: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const quote = await this.calculateTotal(opts.licenseCount);
    if (!this.stripe) {
      return { mode: 'dev' as const, quote, url: null };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: opts.email,
      line_items: [
        {
          price_data: {
            currency: quote.currency.toLowerCase(),
            unit_amount: quote.totalPence,
            product_data: {
              name: 'Wisdom365+ Annual License Pack',
              description: `${opts.licenseCount} license(s) · 12 months access`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        wisdom365SubscriptionId: opts.subscriptionId,
        userId: opts.userId,
        churchId: opts.churchId,
        licenseCount: String(opts.licenseCount),
      },
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
    });

    return { mode: 'stripe' as const, quote, url: session.url, sessionId: session.id };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string) {
    if (!this.stripe) return null;
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) return null;
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
