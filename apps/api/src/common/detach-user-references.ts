import { Prisma } from '@prisma/client';

/**
 * Clear Restrict FKs that point at users so a user row (or church cascade) can delete.
 * Prisma default onDelete is Restrict for several author/assignee fields.
 */
export async function detachUserReferences(
  tx: Prisma.TransactionClient,
  userIds: string[],
) {
  if (!userIds.length) return;

  const byUser = { in: userIds };

  await tx.member.updateMany({ where: { userId: byUser }, data: { userId: null } });
  await tx.followUp.updateMany({ where: { assignedToId: byUser }, data: { assignedToId: null } });
  await tx.notification.updateMany({ where: { userId: byUser }, data: { userId: null } });
  await tx.serviceUnitJoinRequest.updateMany({
    where: { reviewedById: byUser },
    data: { reviewedById: null },
  });
  await tx.communitySupportRequest.updateMany({
    where: { approvedById: byUser },
    data: { approvedById: null },
  });
  await tx.mentorApplication.updateMany({
    where: { approvedById: byUser },
    data: { approvedById: null },
  });
  await tx.devotionalPlan.updateMany({
    where: { createdById: byUser },
    data: { createdById: null },
  });
  await tx.devotionalPdfImport.updateMany({
    where: { uploadedById: byUser },
    data: { uploadedById: null },
  });
  await tx.youthHelpRequest.updateMany({
    where: { assignedToId: byUser },
    data: { assignedToId: null },
  });
  await tx.youthQuestion.updateMany({
    where: { assignedToId: byUser },
    data: { assignedToId: null },
  });

  await tx.message.deleteMany({ where: { senderId: byUser } });
  await tx.inAppMessage.deleteMany({
    where: { OR: [{ senderId: byUser }, { recipientId: byUser }] },
  });
  await tx.pastoralNote.deleteMany({ where: { authorId: byUser } });
  await tx.counselingSession.deleteMany({ where: { authorId: byUser } });
  await tx.youthHelpResponse.deleteMany({ where: { authorId: byUser } });
  await tx.youthAnswer.deleteMany({ where: { authorId: byUser } });
  await tx.sermonNote.deleteMany({ where: { createdById: byUser } });
}
