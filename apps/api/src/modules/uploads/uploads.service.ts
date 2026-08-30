import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.module';

export interface UploadResult {
  url: string;
  path: string;
}

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private readonly rootDir: string;
  private readonly publicBase: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.rootDir = join(process.cwd(), 'uploads');
    const apiPublic =
      this.config.get<string>('API_PUBLIC_URL') ??
      this.config.get<string>('API_URL') ??
      'http://localhost:4000';
    this.publicBase = `${apiPublic.replace(/\/$/, '')}/api/v1/uploads`;
  }

  async onModuleInit() {
    await mkdir(this.rootDir, { recursive: true });
    this.logger.log(`Upload storage: ${this.rootDir}`);
  }

  async saveProfileAvatar(userId: string, file: Express.Multer.File): Promise<UploadResult> {
    this.assertImage(file);
    const result = await this.saveFile(['profiles', userId], file);
    await this.patchUserAvatar(userId, result.url);
    return result;
  }

  async saveProfileAvatarDataUrl(userId: string, imageDataUrl: string): Promise<UploadResult> {
    const trimmed = imageDataUrl?.trim();
    if (!trimmed?.startsWith('data:image/')) {
      throw new BadRequestException('imageDataUrl must be a data:image/... URL');
    }
    const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(trimmed);
    if (!match) {
      throw new BadRequestException('Invalid image data URL');
    }
    const mime = match[1].toLowerCase();
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 750_000) {
      throw new BadRequestException('Image is too large');
    }
    const ext = mime.includes('png') ? '.png' : '.jpg';
    const name = `${randomUUID()}${ext}`;
    const rel = join('profiles', userId, name).replace(/\\/g, '/');
    await this.writeBuffer(rel, buffer);
    const result = this.toResult(rel);
    await this.patchUserAvatar(userId, result.url);
    return result;
  }

  saveSermonAudio(churchId: string, file: Express.Multer.File): Promise<UploadResult> {
    this.assertMime(file, /^audio\//, 'Audio file required');
    return this.saveFile(['sermons', churchId, 'audio'], file);
  }

  saveSermonNotePdf(churchId: string, file: Express.Multer.File): Promise<UploadResult> {
    this.assertMime(file, /^application\/pdf$/, 'PDF file required');
    return this.saveFile(['sermons', churchId, 'pdf'], file);
  }

  saveDeptCurriculumPdf(
    churchId: string,
    serviceUnitId: string,
    file: Express.Multer.File,
  ): Promise<UploadResult> {
    this.assertMime(file, /^application\/pdf$/, 'PDF file required');
    return this.saveFile(['departments', churchId, serviceUnitId, 'curriculum'], file);
  }

  saveDeptChoirAsset(
    churchId: string,
    serviceUnitId: string,
    file: Express.Multer.File,
    assetType: 'audio' | 'sheet' | 'practice',
  ): Promise<UploadResult> {
    if (assetType === 'audio') {
      this.assertMime(file, /^audio\//, 'Audio file required');
    } else {
      this.assertMime(
        file,
        /^(application\/pdf|image\/|audio\/)/,
        'Sheet or practice file must be PDF, image, or audio',
      );
    }
    return this.saveFile(['departments', churchId, serviceUnitId, 'choir', assetType], file);
  }

  saveChurchLogo(churchId: string, file: Express.Multer.File): Promise<UploadResult> {
    this.assertImage(file);
    return this.saveFile(['churches', churchId, 'logo'], file);
  }

  saveLandingHero(churchId: string, file: Express.Multer.File): Promise<UploadResult> {
    this.assertImage(file);
    return this.saveFile(['churches', churchId, 'landing', 'hero'], file);
  }

  saveLandingAboutPhoto(churchId: string, file: Express.Multer.File): Promise<UploadResult> {
    this.assertImage(file);
    return this.saveFile(['churches', churchId, 'landing', 'about'], file);
  }

  saveLandingAnnouncementImage(churchId: string, file: Express.Multer.File): Promise<UploadResult> {
    this.assertImage(file);
    return this.saveFile(['churches', churchId, 'landing', 'announcements'], file);
  }

  saveLandingMessageMp3(churchId: string, file: Express.Multer.File): Promise<UploadResult> {
    this.assertMime(file, /^audio\//, 'MP3 or audio file required');
    return this.saveFile(['churches', churchId, 'landing', 'message'], file);
  }

  /** Remove on-disk upload trees for a purged tenant (best-effort). */
  async deleteChurchStorage(churchId: string): Promise<{ removed: string[] }> {
    const safeId = churchId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeId || safeId !== churchId) {
      throw new BadRequestException('Invalid church id for storage cleanup');
    }
    const candidates = [
      join(this.rootDir, 'churches', churchId),
      join(this.rootDir, 'departments', churchId),
      join(this.rootDir, 'sermons', churchId),
      join(this.rootDir, 'members', churchId),
    ];
    const removed: string[] = [];
    for (const dir of candidates) {
      try {
        await rm(dir, { recursive: true, force: true });
        removed.push(dir);
      } catch (err) {
        this.logger.warn(
          `Upload cleanup skipped for ${dir}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    return { removed };
  }

  private async patchUserAvatar(userId: string, url: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
      select: { id: true, member: { select: { id: true } } },
    });
    if (user.member) {
      await this.prisma.member.update({
        where: { id: user.member.id },
        data: { avatarUrl: url },
      });
    }
  }

  private assertImage(file: Express.Multer.File) {
    this.assertMime(file, /^image\//, 'Image file required');
  }

  private assertMime(file: Express.Multer.File, pattern: RegExp, message: string) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(message);
    }
    const mime = (file.mimetype ?? '').toLowerCase();
    if (!pattern.test(mime)) {
      throw new BadRequestException(message);
    }
  }

  private async saveFile(segments: string[], file: Express.Multer.File): Promise<UploadResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is empty');
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.buffer.length > maxBytes) {
      throw new BadRequestException('File too large (max 5MB)');
    }
    const ext = extname(file.originalname ?? '') || this.extFromMime(file.mimetype);
    const allowed = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.svg']);
    if (ext && !allowed.has(ext.toLowerCase())) {
      throw new BadRequestException('File type not allowed');
    }
    const name = `${randomUUID()}${ext}`;
    const rel = join(...segments, name).replace(/\\/g, '/');
    await this.writeBuffer(rel, file.buffer);
    return this.toResult(rel);
  }

  private async writeBuffer(relativePath: string, buffer: Buffer) {
    const abs = join(this.rootDir, relativePath);
    await mkdir(join(abs, '..'), { recursive: true });
    await writeFile(abs, buffer);
  }

  private toResult(relativePath: string): UploadResult {
    const normalized = relativePath.replace(/\\/g, '/');
    return {
      path: normalized,
      url: `${this.publicBase}/${normalized}`,
    };
  }

  private extFromMime(mime?: string): string {
    const m = (mime ?? '').toLowerCase();
    if (m.includes('png')) return '.png';
    if (m.includes('jpeg') || m.includes('jpg')) return '.jpg';
    if (m.includes('pdf')) return '.pdf';
    if (m.includes('mpeg') || m.includes('mp3')) return '.mp3';
    if (m.includes('wav')) return '.wav';
    if (m.includes('webm')) return '.webm';
    return '.bin';
  }
}
