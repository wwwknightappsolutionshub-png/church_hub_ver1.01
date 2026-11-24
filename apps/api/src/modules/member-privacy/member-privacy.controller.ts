import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MemberFieldPolicyScope } from '@prisma/client';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import { AuthUser, ChurchId, CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';
import {
  RequestMemberPrivacyAccessSchema,
  UpsertMemberFieldPoliciesSchema,
  type RequestMemberPrivacyAccessInput,
  type UpsertMemberFieldPoliciesInput,
} from './dto/member-field-policy.dto';
import { MemberPrivacyService } from './member-privacy.service';

@ApiTags('member-privacy')
@ApiBearerAuth()
@Controller('member-privacy')
export class MemberPrivacyController {
  constructor(private readonly privacy: MemberPrivacyService) {}

  @Get('catalog')
  @Roles('ADMIN', 'PASTOR')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Member field privacy catalog + effective church policies' })
  catalog(@ChurchId() churchId: string) {
    return this.privacy.listPoliciesForEditor(MemberFieldPolicyScope.CHURCH, churchId);
  }

  @Post('church-policies')
  @Roles('ADMIN', 'PASTOR')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Upsert church-level member field access overrides (tighten only)' })
  upsertChurch(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(UpsertMemberFieldPoliciesSchema) body: UpsertMemberFieldPoliciesInput,
  ) {
    return this.privacy.upsertPolicies(
      user,
      MemberFieldPolicyScope.CHURCH,
      churchId,
      body.items,
    );
  }

  @Post('request-access')
  @Throttle({ default: { limit: 3, ttl: 60 * 60_000 } })
  @ApiOperation({
    summary:
      'Cell leadership / LEADER requests elevated member-data access — notifies Admin + Pastor (no auto-unmask)',
  })
  requestAccess(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @ZodBody(RequestMemberPrivacyAccessSchema) body: RequestMemberPrivacyAccessInput,
  ) {
    return this.privacy.requestAccess(user, churchId, body);
  }
}
