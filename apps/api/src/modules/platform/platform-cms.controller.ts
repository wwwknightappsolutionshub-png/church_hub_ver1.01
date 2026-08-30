import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public, Roles, RequirePlatformPermission } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { PlatformCmsService } from './platform-cms.service';
import { CreateCmsPageDto, SeedCmsDto, UpsertCmsPageDto } from './dto/platform-cms.dto';

@ApiTags('platform-content')
@Controller()
export class PlatformCmsController {
  constructor(private readonly cms: PlatformCmsService) {}

  @Public()
  @Get('content/pages')
  @ApiOperation({ summary: 'List published CMS / legal pages' })
  listPublished() {
    return this.cms.listPublished();
  }

  @Public()
  @Get('content/pages/:slug')
  @ApiOperation({ summary: 'Get a published CMS page by slug' })
  getPublished(@Param('slug') slug: string) {
    return this.cms.getPublishedBySlug(slug);
  }

  @ApiBearerAuth()
  @Roles('PLATFORM_ADMIN')
  @RequirePlatformPermission('platform.content:read')
  @Get('platform/content/pages')
  listAdmin() {
    return this.cms.listAdmin();
  }

  @ApiBearerAuth()
  @Roles('PLATFORM_ADMIN')
  @RequirePlatformPermission('platform.content:read')
  @Get('platform/content/pages/:id')
  getAdmin(@Param('id') id: string) {
    return this.cms.getAdminById(id);
  }

  @ApiBearerAuth()
  @Roles('PLATFORM_ADMIN')
  @RequirePlatformPermission('platform.content:write')
  @Post('platform/content/seed')
  seed(@CurrentUser() user: AuthUser, @Body() body: SeedCmsDto) {
    return this.cms.seedDefaults(user.userId, body);
  }

  @ApiBearerAuth()
  @Roles('PLATFORM_ADMIN')
  @RequirePlatformPermission('platform.content:write')
  @Post('platform/content/pages')
  create(@CurrentUser() user: AuthUser, @Body() body: CreateCmsPageDto) {
    return this.cms.create(user.userId, body);
  }

  @ApiBearerAuth()
  @Roles('PLATFORM_ADMIN')
  @RequirePlatformPermission('platform.content:write')
  @Patch('platform/content/pages/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpsertCmsPageDto,
  ) {
    return this.cms.update(user.userId, id, body);
  }

  @ApiBearerAuth()
  @Roles('PLATFORM_ADMIN')
  @RequirePlatformPermission('platform.content:write')
  @Delete('platform/content/pages/:id')
  remove(@Param('id') id: string) {
    return this.cms.remove(id);
  }
}

/** Keep unused Req import quiet if tree-shaken — request helper for privacy controller. */
export function clientMeta(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : req.ip;
  return {
    ipAddress: ip || null,
    userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
  };
}
