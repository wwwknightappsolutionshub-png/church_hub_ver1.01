import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { YouthPointSource } from '@prisma/client';
import { YouthGamificationService } from './gamification.service';
import { ChurchId, CurrentUser, AuthUser } from '../../auth/current-user.decorator';
import { Roles, ModuleGate } from '../../auth/decorators';

@ApiTags('youth')
@ApiBearerAuth()
@ModuleGate('youth')
@Controller('youth/gamification')
export class YouthGamificationController {
  constructor(private readonly gamification: YouthGamificationService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user gamification dashboard' })
  getMe(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.gamification.getMe(churchId, user.userId);
  }

  @Get('leaderboard')
  leaderboard(@ChurchId() churchId: string, @Query('limit') limit?: string) {
    return this.gamification.getLeaderboard(
      churchId,
      limit ? parseInt(limit, 10) : 25,
    );
  }

  @Get('badges')
  listBadges() {
    return this.gamification.listBadges();
  }

  @Get('achievements')
  listAchievements(@ChurchId() churchId: string) {
    return this.gamification.listAchievements(churchId);
  }

  @Get('challenges')
  async listChallenges(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
  ) {
    try {
      const me = await this.gamification.getMe(churchId, user.userId);
      return this.gamification.listChallenges(churchId, me.memberId);
    } catch {
      return this.gamification.listChallenges(churchId);
    }
  }

  @Get('ledger')
  ledger(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    return this.gamification.getMe(churchId, user.userId).then((me) =>
      this.gamification.listLedger(
        churchId,
        me.memberId,
        limit ? parseInt(limit, 10) : 50,
      ),
    );
  }

  @Post('score')
  @ApiOperation({ summary: 'Score an event (dev hook / module integration)' })
  scoreEvent(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      source: YouthPointSource;
      memberId?: string;
      delta?: number;
      reason?: string;
      sourceId?: string;
    },
  ) {
    const run = async (memberId: string) =>
      this.gamification.scoreEvent(churchId, memberId, body.source, {
        delta: body.delta,
        reason: body.reason,
        sourceId: body.sourceId,
      });

    if (body.memberId) return run(body.memberId);
    return this.gamification.getMe(churchId, user.userId).then((me) =>
      run(me.memberId),
    );
  }

  @Post('challenges')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  createChallenge(@ChurchId() churchId: string, @Body() body: Record<string, unknown>) {
    return this.gamification.createChallenge(
      churchId,
      body as Parameters<YouthGamificationService['createChallenge']>[1],
    );
  }

  @Post('challenges/:challengeId/progress')
  incrementChallenge(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('challengeId') challengeId: string,
    @Body() body: { increment?: number },
  ) {
    return this.gamification.getMe(churchId, user.userId).then((me) =>
      this.gamification.incrementChallenge(
        churchId,
        me.memberId,
        challengeId,
        body.increment ?? 1,
      ),
    );
  }

  @Post(':memberId/points')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  awardPoints(
    @ChurchId() churchId: string,
    @Param('memberId') memberId: string,
    @Body() body: { points: number },
  ) {
    return this.gamification.awardPoints(memberId, body.points, churchId);
  }

  @Post(':memberId/badges/:badgeId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  awardBadge(@Param('memberId') memberId: string, @Param('badgeId') badgeId: string) {
    return this.gamification.issueBadge(memberId, badgeId);
  }
}
