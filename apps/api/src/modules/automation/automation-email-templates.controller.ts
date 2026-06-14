import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChurchId } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';
import { AutomationEmailTemplatesService } from './automation-email-templates.service';

@ApiTags('automation')
@ApiBearerAuth()
@Controller('automation/email-templates')
export class AutomationEmailTemplatesController {
  constructor(private readonly templates: AutomationEmailTemplatesService) {}

  @Get()
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'List automation email templates' })
  list(@ChurchId() churchId: string) {
    return this.templates.list(churchId);
  }

  @Post()
  @Roles('ADMIN', 'PASTOR')
  create(
    @ChurchId() churchId: string,
    @Body() body: { name: string; subject: string; bodyHtml: string },
  ) {
    return this.templates.createCustom(churchId, body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PASTOR')
  update(
    @ChurchId() churchId: string,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; subject: string; bodyHtml: string; isActive: boolean }>,
  ) {
    return this.templates.update(churchId, id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'PASTOR')
  remove(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.templates.remove(churchId, id);
  }
}
