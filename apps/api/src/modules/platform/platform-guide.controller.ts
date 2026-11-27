import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public, RequirePlatformPermission, Roles } from '../auth/decorators';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { UpsertGuidePageDto } from './dto/platform-guide.dto';
import { PlatformGuideService } from './platform-guide.service';

@ApiTags('public-guides')
@Controller('public/guides')
export class PublicGuideController {
  constructor(private readonly guides: PlatformGuideService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Published articles for the blog index' })
  list() {
    return this.guides.listPublishedPosts();
  }

  @Public()
  @Get('home')
  @ApiOperation({ summary: 'Articles flagged for the homepage row' })
  home() {
    return this.guides.listHomepage();
  }

  @Public()
  @Get('paths')
  @ApiOperation({ summary: 'Published About and article paths for the sitemap' })
  paths() {
    return this.guides.listPaths();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'One published About page or article' })
  getOne(@Param('slug') slug: string) {
    return this.guides.getPublished(slug);
  }
}

@ApiTags('platform-content')
@ApiBearerAuth()
@Roles('PLATFORM_ADMIN')
@Controller('platform/content/guides')
export class PlatformGuideController {
  constructor(private readonly guides: PlatformGuideService) {}

  @Get()
  @RequirePlatformPermission('platform.content:read')
  list() {
    return this.guides.listAdmin();
  }

  @Get(':id')
  @RequirePlatformPermission('platform.content:read')
  getOne(@Param('id') id: string) {
    return this.guides.getAdmin(id);
  }

  @Post()
  @RequirePlatformPermission('platform.content:write')
  create(@CurrentUser() user: AuthUser, @Body() body: UpsertGuidePageDto) {
    return this.guides.create(user.userId, body);
  }

  @Patch(':id')
  @RequirePlatformPermission('platform.content:write')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpsertGuidePageDto,
  ) {
    return this.guides.update(user.userId, id, body);
  }

  @Delete(':id')
  @RequirePlatformPermission('platform.content:write')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.guides.remove(user.userId, id);
  }
}
