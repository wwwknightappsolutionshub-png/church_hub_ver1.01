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
import type {
  OutreachImportColumnMapping,
  OutreachImportOptions,
} from '@church-hub/shared-types';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ModuleGate, Roles } from '../auth/decorators';
import { OutreachImportService } from './outreach-import.service';

@ApiTags('outreach-import')
@ApiBearerAuth()
@Controller('outreach/import')
@ModuleGate('followUp')
@Roles('ADMIN', 'PASTOR')
export class OutreachImportController {
  constructor(private readonly importService: OutreachImportService) {}

  @Get('template.csv')
  @ApiOperation({ summary: 'Download outreach CSV import template' })
  downloadTemplate(@Res() res: Response) {
    const csv = this.importService.getTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="churchhub-outreach-import-template.csv"',
    );
    res.send(csv);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload outreach CSV and create import job' })
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
  @ApiOperation({ summary: 'Map columns and dry-run outreach import' })
  preview(
    @ChurchId() churchId: string,
    @Body()
    body: {
      jobId: string;
      columnMapping: OutreachImportColumnMapping;
      options?: OutreachImportOptions;
    },
  ) {
    return this.importService.preview(churchId, body.jobId, {
      columnMapping: body.columnMapping,
      options: body.options,
    });
  }

  @Post('commit')
  @ApiOperation({ summary: 'Commit previewed outreach CSV import' })
  commit(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { jobId: string },
  ) {
    return this.importService.commit(churchId, body.jobId, user.userId);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get outreach import job status' })
  getJob(@ChurchId() churchId: string, @Param('id') id: string) {
    return this.importService.getJob(churchId, id);
  }
}
