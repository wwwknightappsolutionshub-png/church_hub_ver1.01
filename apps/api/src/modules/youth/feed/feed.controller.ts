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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentReportStatus, YouthPostStatus, YouthReactionType } from '@prisma/client';
import { YouthFeedService } from './feed.service';
import { ChurchId, CurrentUser, AuthUser } from '../../auth/current-user.decorator';
import { Roles, ModuleGate } from '../../auth/decorators';
import { AllowMemberOwnedDelete } from '../../auth/destructive.decorators';

@ApiTags('youth')
@ApiBearerAuth()
@ModuleGate('youth')
@AllowMemberOwnedDelete()
@Controller('youth/feed')
export class YouthFeedController {
  constructor(private readonly feed: YouthFeedService) {}

  @Get('posts')
  @ApiOperation({ summary: 'List feed posts (cursor pagination)' })
  listPosts(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Query('youthGroupId') youthGroupId?: string,
    @Query('sort') sort?: 'recent' | 'top',
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('moderator') moderator?: string,
  ) {
    return this.feed.listFeed(churchId, user.userId, {
      youthGroupId,
      sort,
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      moderator: moderator === 'true',
    });
  }

  @Get('posts/flagged')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  @ApiOperation({ summary: 'List flagged or hidden posts (moderators)' })
  listFlagged(@ChurchId() churchId: string) {
    return this.feed.listFlaggedPosts(churchId);
  }

  @Get('posts/:postId')
  getPost(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Query('moderator') moderator?: string,
  ) {
    return this.feed.getPost(churchId, user.userId, postId, moderator === 'true');
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create a feed post' })
  createPost(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.feed.createPost(churchId, user.userId, body as Parameters<YouthFeedService['createPost']>[2]);
  }

  @Patch('posts/:postId')
  updatePost(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() body: { content?: string },
  ) {
    return this.feed.updatePost(churchId, user.userId, postId, body);
  }

  @Delete('posts/:postId')
  deletePost(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
  ) {
    return this.feed.deletePost(churchId, user.userId, postId);
  }

  @Get('posts/:postId/comments')
  listComments(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.feed.listComments(churchId, user.userId, postId, parentId);
  }

  @Post('posts/:postId/comments')
  createComment(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.feed.createComment(churchId, user.userId, postId, body);
  }

  @Post('reactions')
  addReaction(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      postId?: string;
      commentId?: string;
      reactionType?: YouthReactionType;
    },
  ) {
    return this.feed.addReaction(churchId, user.userId, body);
  }

  @Delete('reactions')
  removeReaction(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      postId?: string;
      commentId?: string;
      reactionType?: YouthReactionType;
    },
  ) {
    return this.feed.removeReaction(churchId, user.userId, body);
  }

  @Post('media')
  @ApiOperation({ summary: 'Register uploaded media URL before attaching to a post' })
  registerMedia(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: Record<string, unknown>,
  ) {
    return this.feed.registerMedia(
      churchId,
      user.userId,
      body as Parameters<YouthFeedService['registerMedia']>[2],
    );
  }

  @Post('posts/:postId/report')
  reportPost(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() body: { reason: string },
  ) {
    return this.feed.reportPost(churchId, user.userId, postId, body.reason);
  }

  @Get('reports')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  listReports(
    @ChurchId() churchId: string,
    @Query('status') status?: ContentReportStatus,
  ) {
    return this.feed.listReports(churchId, status);
  }

  @Patch('reports/:reportId')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  reviewReport(
    @ChurchId() churchId: string,
    @Param('reportId') reportId: string,
    @Body() body: { status: ContentReportStatus; hidePost?: boolean },
  ) {
    return this.feed.reviewReport(churchId, reportId, body);
  }

  @Patch('posts/:postId/moderate')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  moderatePost(
    @ChurchId() churchId: string,
    @Param('postId') postId: string,
    @Body() body: { status: YouthPostStatus },
  ) {
    return this.feed.moderatePost(churchId, postId, body);
  }
}
