import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ChurchId } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Admin analytics dashboard metrics' })
  getDashboard(@ChurchId() churchId: string) {
    return this.adminService.getDashboardMetrics(churchId);
  }

  @Get('hub')
  @Roles('ADMIN', 'PASTOR')
  @ApiOperation({ summary: 'Unified admin command center (cross-module KPIs)' })
  getUnifiedHub(@ChurchId() churchId: string) {
    return this.adminService.getUnifiedHub(churchId);
  }
}
