import { ForbiddenException, Injectable } from '@nestjs/common';
import { ModuleAccessService, UserMemberContext } from '../access/module-access.service';

@Injectable()
export class SermonNoteAccessService {
  constructor(private readonly moduleAccess: ModuleAccessService) {}

  async requireAccess(userId: string, churchId: string): Promise<UserMemberContext> {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) throw new ForbiddenException('Access denied');
    if (await this.canManageSermonNotes(ctx)) return ctx;
    throw new ForbiddenException('Sermon Note is available to pastors only');
  }

  async canManageSermonNotes(ctx: UserMemberContext): Promise<boolean> {
    return this.moduleAccess.canAccessSermonNote(ctx);
  }
}
