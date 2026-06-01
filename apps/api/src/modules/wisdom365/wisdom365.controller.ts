import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Public, Roles } from '../auth/decorators';
import { Wisdom365InsightsService } from './wisdom365-insights.service';
import { Wisdom365SubscriptionService } from './wisdom365-subscription.service';
import { Wisdom365ContentService } from './wisdom365-content.service';
import { Wisdom365StripeService } from './wisdom365-stripe.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AssignVariantsDto,
  CompleteJournalDto,
  CreateCheckoutDto,
  UpsertReminderDto,
} from './dto/wisdom365.dto';
import type { Request } from 'express';

@ApiTags('wisdom365')
@ApiBearerAuth()
@Controller('wisdom365')
export class Wisdom365Controller {
  constructor(
    private readonly subscriptions: Wisdom365SubscriptionService,
    private readonly content: Wisdom365ContentService,
    private readonly stripe: Wisdom365StripeService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly insights: Wisdom365InsightsService,
  ) {}

  @Get('catalog')
  @ApiOperation({ summary: 'List active journey variants for landing page' })
  async catalog(@CurrentUser() user: AuthUser) {
    const variants = await this.prisma.wisdom365Variant.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const me = await this.subscriptions.getMe(user);
    const config = await this.prisma.wisdom365ProductConfig.findUnique({
      where: { id: 'default' },
    });
    const quoteSample = await this.stripe.calculateTotal(2);
    return { variants, me, product: config, sampleQuote: quoteSample };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.subscriptions.getMe(user);
  }

  @Post('checkout')
  checkout(@CurrentUser() user: AuthUser, @Body() body: CreateCheckoutDto) {
    const webBase =
      this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3001';
    return this.subscriptions.createCheckout(user, body.licenseCount, webBase);
  }

  @Post('checkout/complete-dev')
  @ApiOperation({ summary: 'Complete pending checkout in dev when Stripe is not configured' })
  completeDev(@CurrentUser() user: AuthUser, @Body('subscriptionId') subscriptionId: string) {
    return this.subscriptions.completeDevCheckout(user, subscriptionId);
  }

  @Post('assign')
  assign(@CurrentUser() user: AuthUser, @Body() body: AssignVariantsDto) {
    return this.subscriptions.assignVariants(
      user,
      body.subscriptionId,
      body.variantSlugs,
      body.kidsGrants,
    );
  }

  @Get('family-children')
  familyChildren(@CurrentUser() user: AuthUser) {
    return this.subscriptions.listFamilyChildren(user);
  }

  @Get('journeys/:slug/today')
  today(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Query('firstName') firstName?: string,
  ) {
    return this.content.getDayForUser(user, slug, undefined, firstName);
  }

  @Get('journeys/:slug/days/:dayOfYear')
  day(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Param('dayOfYear') dayOfYear: string,
    @Query('firstName') firstName?: string,
  ) {
    return this.content.getDayForUser(user, slug, parseInt(dayOfYear, 10), firstName);
  }

  @Get('journeys/:slug/history')
  history(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.content.listHistory(user, slug);
  }

  @Get('journeys/:slug/progress')
  progress(@CurrentUser() user: AuthUser, @Param('slug') slug: string) {
    return this.content.getProgress(user, slug);
  }

  @Post('journeys/:slug/complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body() body: CompleteJournalDto,
  ) {
    return this.content.markComplete(user, slug, body.journalText);
  }

  @Patch('journeys/:slug/reminder')
  reminder(
    @CurrentUser() user: AuthUser,
    @Param('slug') slug: string,
    @Body() body: UpsertReminderDto,
  ) {
    return this.content.upsertReminder(user, slug, body);
  }

  @Get('reminders')
  @ApiOperation({ summary: 'All reminder prefs for provisioned journeys' })
  reminders(@CurrentUser() user: AuthUser) {
    return this.content.listRemindersForUser(user.userId);
  }

  @Get('insights/church')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Church-wide Wisdom365+ engagement (staff)' })
  churchInsights(@CurrentUser() user: AuthUser) {
    return this.insights.getChurchInsights(user);
  }

  @Public()
  @Post('webhooks/stripe')
  async stripeWebhook(@Req() req: Request) {
    const signature = req.headers['stripe-signature'] as string;
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody || !signature) {
      return { received: false };
    }
    const event = this.stripe.constructWebhookEvent(rawBody, signature);
    if (!event) return { received: false };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { id: string; metadata?: Record<string, string> };
      await this.subscriptions.handleStripeCheckoutCompleted(session.id, session.metadata ?? {});
    }
    return { received: true };
  }
}
