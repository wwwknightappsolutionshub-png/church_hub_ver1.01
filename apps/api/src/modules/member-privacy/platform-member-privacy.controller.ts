import { Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MemberFieldPolicyScope } from '@prisma/client';
import { ZodBody } from '../../common/decorators/zod-body.decorator';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { RequirePlatformPermission, Roles } from '../auth/decorators';
import {
  UpsertMemberFieldPoliciesSchema,
  type UpsertMemberFieldPoliciesInput,
} from './dto/member-field-policy.dto';
import { MemberPrivacyService } from './member-privacy.service';

@ApiTags('platform-member-privacy')
@ApiBearerAuth()
@Roles('PLATFORM_ADMIN')
@Controller('platform/member-privacy')
export class PlatformMemberPrivacyController {
  constructor(private readonly privacy: MemberPrivacyService) {}

  @Get('catalog')
  @RequirePlatformPermission('platform.privacy:read')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Platform field access catalog (global or per-tenant effective view)',
  })
  catalog(
    @Query('scope') scopeRaw?: string,
    @Query('churchId') churchId?: string,
  ) {
    const scope =
      scopeRaw === 'PLATFORM_TENANT'
        ? MemberFieldPolicyScope.PLATFORM_TENANT
        : MemberFieldPolicyScope.PLATFORM_GLOBAL;
    if (scope === MemberFieldPolicyScope.PLATFORM_TENANT && !churchId?.trim()) {
      throw new BadRequestException('churchId required for PLATFORM_TENANT scope');
    }
    return this.privacy.listPoliciesForEditor(
      scope,
      scope === MemberFieldPolicyScope.PLATFORM_GLOBAL ? null : churchId!.trim(),
    );
  }

  @Post('policies')
  @RequirePlatformPermission('platform.privacy:write')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Upsert platform global or per-tenant field access overrides' })
  upsert(
    @CurrentUser() user: AuthUser,
    @Query('scope') scopeRaw: string | undefined,
    @Query('churchId') churchId: string | undefined,
    @ZodBody(UpsertMemberFieldPoliciesSchema) body: UpsertMemberFieldPoliciesInput,
  ) {
    const scope =
      scopeRaw === 'PLATFORM_TENANT'
        ? MemberFieldPolicyScope.PLATFORM_TENANT
        : MemberFieldPolicyScope.PLATFORM_GLOBAL;
    if (scope === MemberFieldPolicyScope.PLATFORM_TENANT && !churchId?.trim()) {
      throw new BadRequestException('churchId required for PLATFORM_TENANT scope');
    }
    return this.privacy.upsertPolicies(
      user,
      scope,
      scope === MemberFieldPolicyScope.PLATFORM_GLOBAL ? null : churchId!.trim(),
      body.items,
    );
  }
}
