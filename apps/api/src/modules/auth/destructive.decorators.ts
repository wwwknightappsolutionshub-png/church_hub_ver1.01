import { SetMetadata } from '@nestjs/common';

/** Opt out of global DELETE → ADMIN/PASTOR rule (member-owned resources). */
export const ALLOW_MEMBER_OWNED_DELETE_KEY = 'allowMemberOwnedDelete';
export const AllowMemberOwnedDelete = () => SetMetadata(ALLOW_MEMBER_OWNED_DELETE_KEY, true);
