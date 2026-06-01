import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { YouthQuestionCategory, YouthQuestionStatus } from '@prisma/client';
import { YouthQaService } from './qa.service';
import { ChurchId, CurrentUser, AuthUser } from '../../auth/current-user.decorator';
import { Roles, ModuleGate } from '../../auth/decorators';

@ApiTags('youth')
@ApiBearerAuth()
@ModuleGate('youth')
@Controller('youth/qa')
export class YouthQaController {
  constructor(private readonly qa: YouthQaService) {}

  @Get('board')
  @ApiOperation({ summary: 'Public answers board (published Q&A)' })
  listBoard(
    @ChurchId() churchId: string,
    @Query('category') category?: YouthQuestionCategory,
    @Query('limit') limit?: string,
  ) {
    return this.qa.listPublicBoard(churchId, {
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'My submitted questions and private replies' })
  listMine(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.qa.listMyQuestions(churchId, user.userId);
  }

  @Get('queue')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  @ApiOperation({ summary: 'Leader dashboard queue' })
  listQueue(
    @ChurchId() churchId: string,
    @Query('status') status?: YouthQuestionStatus,
    @Query('category') category?: YouthQuestionCategory,
  ) {
    return this.qa.listQueue(churchId, { status, category });
  }

  @Get('moderation/hidden')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  @ApiOperation({ summary: 'Hidden / moderated questions' })
  listHidden(@ChurchId() churchId: string) {
    return this.qa.listHidden(churchId);
  }

  @Post('questions')
  @ApiOperation({ summary: 'Submit anonymous question' })
  submit(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      question: string;
      category?: YouthQuestionCategory;
      isAnonymous?: boolean;
      alias?: string;
    },
  ) {
    return this.qa.submitQuestion(churchId, user.userId, body);
  }

  @Get('questions/:questionId')
  getOne(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('questionId') questionId: string,
  ) {
    return this.qa.getQuestion(churchId, user.userId, questionId);
  }

  @Patch('questions/:questionId/assign')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  assign(
    @ChurchId() churchId: string,
    @Param('questionId') questionId: string,
    @Body() body: { assignedToId: string },
  ) {
    return this.qa.assignQuestion(churchId, questionId, body.assignedToId);
  }

  @Post('questions/:questionId/reply')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  @ApiOperation({ summary: 'Private reply to asker' })
  replyPrivate(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('questionId') questionId: string,
    @Body() body: { body: string },
  ) {
    return this.qa.replyPrivate(churchId, user.userId, questionId, body.body);
  }

  @Post('questions/:questionId/publish')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  @ApiOperation({ summary: 'Publish answer on public board' })
  publish(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('questionId') questionId: string,
    @Body() body: { body: string },
  ) {
    return this.qa.publishPublicAnswer(
      churchId,
      user.userId,
      questionId,
      body.body,
    );
  }

  @Patch('questions/:questionId/hide')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  hide(
    @ChurchId() churchId: string,
    @Param('questionId') questionId: string,
    @Body() body: { reason?: string },
  ) {
    return this.qa.hideQuestion(churchId, questionId, body.reason);
  }

  @Patch('questions/:questionId/restore')
  @Roles('ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN')
  restore(@ChurchId() churchId: string, @Param('questionId') questionId: string) {
    return this.qa.restoreQuestion(churchId, questionId);
  }
}
