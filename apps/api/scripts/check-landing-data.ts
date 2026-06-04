import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const church = await prisma.church.findUnique({ where: { slug: 'demo-church' } });
  if (!church) {
    console.log('church not found');
    return;
  }
  console.log('churchId', church.id, 'isActive', church.isActive);
  const approved = await prisma.communitySupportRequest.count({
    where: { churchId: church.id, status: 'APPROVED' },
  });
  const total = await prisma.communitySupportRequest.count({ where: { churchId: church.id } });
  console.log('communitySupport approved', approved, 'total', total);

  const settings = church.settings as { landing?: Record<string, unknown> };
  const landing = settings?.landing;
  const sf = landing?.socialFeed as Record<string, unknown> | undefined;
  console.log('socialFeed keys', sf ? Object.keys(sf) : 'none');
  const messages = sf?.messages as { items?: unknown[] } | undefined;
  const youtube = sf?.youtube as { items?: unknown[] } | undefined;
  console.log('messages items', messages?.items?.length ?? 0);
  console.log('youtube items', youtube?.items?.length ?? 0);
  console.log('landing published', landing?.published);
  console.log('communitySupport section', landing?.communitySupport);

  const rows = await prisma.communitySupportRequest.findMany({
    where: { churchId: church.id, status: 'APPROVED' },
    take: 5,
    select: { id: true, title: true, status: true },
  });
  console.log('sample approved', rows);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
