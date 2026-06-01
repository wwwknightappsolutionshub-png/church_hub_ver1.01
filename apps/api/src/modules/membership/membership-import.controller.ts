import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/decorators';
import { MembershipImportService } from './membership-import.service';
import type { MembershipImportColumnMapping, MembershipImportOptions } from '@church-hub/shared-types';

@ApiTags('membership-import')
@ApiBearerAuth()
@Controller('membership/import')
@Roles('ADMIN', 'PASTOR')
export class MembershipImportController {
  constructor(private readonly importService: MembershipImportService) {}

  @Get('template.csv')
  @ApiOperation({ summary: 'Download CSV import template' })
  downloadTemplate(@Res() res: Response) {
    const csv = this.importService.getTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="churchhub-member-import-template.csv"');
    res.send(csv);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload CSV and create import job' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  upload(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.importService.upload(churchId, user.userId, file);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Map columns and dry-run import' })
  preview(
    @ChurchId() churchId: string,
    @Body()
    body: {
      jobId: string;
      columnMapping: MembershipImportColumnMapping;
      options?: MembershipImportOptions;
    },
  ) {
    return this.importService.preview(churchId, body.jobId, {
      columnMapping: body.columnMapping,
      options: body.options,
    });
  }

  @Post('commit')
  @ApiOperation({ summary: 'Apply previewed import' })
  commit(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { jobId: string },
  ) {
    return this.importService.commit(churchId, body.jobId, user.userId);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get import job status and rows' })
  getJob(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.importService.getJob(churchId, id);
  }
}
