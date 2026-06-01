import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser, ChurchId } from '../auth/current-user.decorator';
import { SermonNotesService } from './sermon-notes.service';
import { SermonNoteAccessService } from './sermon-note-access.service';
import { CreateSermonNoteDto } from './dto/create-sermon-note.dto';
import { UpdateSermonNoteDto } from './dto/update-sermon-note.dto';
import { UploadsService } from '../uploads/uploads.service';

@ApiTags('sermon-notes')
@ApiBearerAuth()
@Controller('sermon-notes')
export class SermonNotesController {
  constructor(
    private readonly sermonNotes: SermonNotesService,
    private readonly access: SermonNoteAccessService,
    private readonly uploads: UploadsService,
  ) {}

  private async gate(userId: string, churchId: string) {
    return this.access.requireAccess(userId, churchId);
  }

  @Get()
  @ApiOperation({ summary: 'List sermon notes (pastor only)' })
  async list(@ChurchId() churchId: string, @CurrentUser() user: AuthUser) {
    await this.gate(user.userId, churchId);
    return this.sermonNotes.list(churchId);
  }

  @Get(':id')
  async getOne(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    await this.gate(user.userId, churchId);
    return this.sermonNotes.getOne(churchId, id);
  }

  @Post()
  async create(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateSermonNoteDto,
  ) {
    await this.gate(user.userId, churchId);
    return this.sermonNotes.create(churchId, user.userId, body);
  }

  @Patch(':id')
  async update(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateSermonNoteDto,
  ) {
    await this.gate(user.userId, churchId);
    return this.sermonNotes.update(churchId, id, body);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Transcribe/summarize and build 7-day devotional draft' })
  async process(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    await this.gate(user.userId, churchId);
    return this.sermonNotes.process(churchId, id, user.userId);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish devotional and notify all members in-app' })
  async publish(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    await this.gate(user.userId, churchId);
    return this.sermonNotes.publish(churchId, id, user.userId);
  }

  @Post('upload/audio')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadAudio(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.gate(user.userId, churchId);
    if (!file) throw new BadRequestException('Choose an audio file from your device');
    return this.uploads.saveSermonAudio(churchId, file);
  }

  @Post('upload/pdf')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    }),
  )
  async uploadPdf(
    @ChurchId() churchId: string,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.gate(user.userId, churchId);
    if (!file) throw new BadRequestException('Choose a PDF from your device');
    return this.uploads.saveSermonNotePdf(churchId, file);
  }
}
