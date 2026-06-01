import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChurchStaffService } from './church-staff.service';
import { CreateChurchStaffDto, UpdateChurchStaffDto } from './dto/church-staff.dto';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';

@ApiTags('church-staff')
@ApiBearerAuth()
@Controller('church-staff')
@Roles('PASTOR', 'ADMIN')
export class ChurchStaffController {
  constructor(private readonly staff: ChurchStaffService) {}

  @Get()
  list(@ChurchId() churchId: string) {
    return this.staff.list(churchId);
  }

  @Get(':id')
  getOne(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.staff.findOne(churchId, id);
  }

  @Post()
  create(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateChurchStaffDto,
  ) {
    return this.staff.create(churchId, user.userId, body);
  }

  @Patch(':id')
  update(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateChurchStaffDto,
  ) {
    return this.staff.update(churchId, id, user.userId, body);
  }

  @Delete(':id')
  remove(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.staff.remove(churchId, id, user.userId);
  }
}
