import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccessModule } from '../access/access.module';
import { DevotionalHubModule } from '../devotional-hub/devotional-hub.module';
import { CommunicationsModule } from '../communications/communications.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SermonNotesController } from './sermon-notes.controller';
import { SermonNotesService } from './sermon-notes.service';
import { SermonNoteAccessService } from './sermon-note-access.service';

@Module({
  imports: [PrismaModule, AccessModule, DevotionalHubModule, CommunicationsModule, UploadsModule],
  controllers: [SermonNotesController],
  providers: [SermonNotesService, SermonNoteAccessService],
  exports: [SermonNoteAccessService],
})
export class SermonNotesModule {}
