import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChurchId, CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('profile-avatar')
  @ApiOperation({ summary: 'Upload profile photo (multipart)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  profileAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Choose a photo file');
    return this.uploads.saveProfileAvatar(user.userId, file);
  }

  @Post('sermon-audio')
  @ApiOperation({ summary: 'Upload sermon audio' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  sermonAudio(@ChurchId() churchId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Choose an audio file');
    return this.uploads.saveSermonAudio(churchId, file);
  }

  @Post('church-logo')
  @ApiOperation({ summary: 'Upload church logo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  churchLogo(@ChurchId() churchId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Choose a logo image');
    return this.uploads.saveChurchLogo(churchId, file);
  }

  @Post('landing-hero')
  @ApiOperation({ summary: 'Upload landing page hero image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  landingHero(@ChurchId() churchId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Choose a hero image');
    return this.uploads.saveLandingHero(churchId, file);
  }

  @Post('landing-about-photo')
  @ApiOperation({ summary: 'Upload landing page pastor / about photo' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  landingAboutPhoto(@ChurchId() churchId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Choose a photo');
    return this.uploads.saveLandingAboutPhoto(churchId, file);
  }

  @Post('landing-announcement-image')
  @ApiOperation({ summary: 'Upload landing page announcement card image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    }),
  )
  landingAnnouncementImage(
    @ChurchId() churchId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Choose an image');
    return this.uploads.saveLandingAnnouncementImage(churchId, file);
  }

  @Post('landing-message-mp3')
  @ApiOperation({ summary: 'Upload landing pastor message audio' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024, files: 1 },
    }),
  )
  landingMessageMp3(
    @ChurchId() churchId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Choose an audio file');
    return this.uploads.saveLandingMessageMp3(churchId, file);
  }
}
