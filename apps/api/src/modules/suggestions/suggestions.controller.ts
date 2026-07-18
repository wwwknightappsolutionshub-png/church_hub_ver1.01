import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SuggestionTopic } from '@prisma/client';
import { SuggestionsService } from './suggestions.service';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';

@ApiTags('suggestions')
@ApiBearerAuth()
@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly suggestions: SuggestionsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a suggestion / feedback for pastors and church admins' })
  create(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      topic: SuggestionTopic;
      subject?: string;
      body: string;
    },
  ) {
    return this.suggestions.create(churchId, user.userId, body);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List suggestions submitted by the current user' })
  listMine(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    return this.suggestions.listMine(churchId, user.userId);
  }
}
