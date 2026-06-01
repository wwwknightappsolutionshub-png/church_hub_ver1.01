import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommunityHubType } from '@prisma/client';
import { CommunityHubService } from './community-hub.service';
import { CreatePrayerDto } from './dto/create-prayer.dto';
import { CreatePraiseDto } from './dto/create-praise.dto';
import { CreateHubCommentDto } from './dto/create-comment.dto';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles, ModuleGate } from '../auth/decorators';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import {
  createPrayerSchema,
  createPraiseSchema,
  hubCommentSchema,
  hubPostUpdateSchema,
} from './community-hub.schemas';
import type { z } from 'zod';

@ApiTags('community-hub')
@ApiBearerAuth()
@ModuleGate('communityHub')
@Controller('community-hub')
export class CommunityHubController {
  constructor(private readonly hub: CommunityHubService) {}

  @Get('prayer')
  listPrayer(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.hub.listForUser(churchId, user.userId, 'PRAYER', {
      cursor,
      limit: limit ? parseInt(limit, 10) : 12,
      from,
      to,
    });
  }

  @Post('prayer')
  createPrayer(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(createPrayerSchema) body: z.infer<typeof createPrayerSchema>,
  ) {
    const { memberId, ...data } = body;
    return this.hub.createPrayer(churchId, user.userId, memberId ?? null, data);
  }

  @Get('praise')
  listPraise(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.hub.listForUser(churchId, user.userId, 'PRAISE', {
      cursor,
      limit: limit ? parseInt(limit, 10) : 12,
      from,
      to,
    });
  }

  @Post('praise')
  createPraise(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(createPraiseSchema) body: z.infer<typeof createPraiseSchema>,
  ) {
    const { memberId, subject, testimony, displayName } = body;
    return this.hub.createPraise(churchId, user.userId, memberId ?? null, {
      testimony,
      description: subject.trim() ? `${subject.trim()}\n\n${testimony}` : testimony,
      displayName,
      showDisplayName: Boolean(displayName?.trim()),
    });
  }

  @Get('posts/:id')
  getPost(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.hub.getPostDetail(churchId, user.userId, id);
  }

  @Post('posts/:id/like')
  toggleLike(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.hub.toggleLike(churchId, user.userId, id);
  }

  @Get('posts/:id/comments')
  listComments(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.hub.listComments(churchId, user.userId, id);
  }

  @Post('posts/:id/comments')
  addComment(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(hubCommentSchema) body: z.infer<typeof hubCommentSchema>,
  ) {
    return this.hub.addComment(churchId, user.userId, id, body.body);
  }

  @Get('pastor/:type')
  @Roles('ADMIN', 'PASTOR')
  pastorList(
    @ChurchId() churchId: string,
    @Param('type') type: string,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    const hubType = type.toUpperCase() === 'PRAISE' ? 'PRAISE' : 'PRAYER';
    return this.hub.pastorList(churchId, hubType as CommunityHubType, status);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PASTOR')
  update(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @ZodBody(hubPostUpdateSchema) body: z.infer<typeof hubPostUpdateSchema>,
  ) {
    return this.hub.updatePost(churchId, id, body, user.userId);
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'PASTOR')
  approve(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.hub.approveNow(churchId, id, user.userId);
  }

  @Delete(':id')
  @Roles('ADMIN', 'PASTOR')
  remove(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.hub.deletePost(churchId, id);
  }
}
