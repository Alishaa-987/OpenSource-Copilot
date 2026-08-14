import { Prisma, PrismaClient } from '../../../../libs/guidance-database/generated';

const integration = process.env['RUN_INTEGRATION'] === '1' ? it : it.skip;

describe('guidance-service Recommendation data model', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
  }, 30_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  integration('stores recommendations with service-level UUID references and enforces ranking uniqueness', async () => {
    const repositoryId = crypto.randomUUID();
    const issueId = crypto.randomUUID();

    try {
      const recommendation = await prisma.recommendation.create({
        data: {
          repositoryId,
          issueId,
          score: new Prisma.Decimal('0.910000'),
          rank: 1,
          reason: 'Guidance model constraint test',
        },
      });

      expect(recommendation.repositoryId).toBe(repositoryId);
      expect(recommendation.issueId).toBe(issueId);

      await expect(
        prisma.recommendation.create({
          data: {
            repositoryId,
            issueId: crypto.randomUUID(),
            score: new Prisma.Decimal('0.800000'),
            rank: 1,
            reason: 'Duplicate rank test',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });

      await expect(
        prisma.recommendation.create({
          data: {
            repositoryId,
            issueId,
            score: new Prisma.Decimal('0.700000'),
            rank: 2,
            reason: 'Duplicate issue test',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });

      const issueWithoutRepositoryRow = await prisma.recommendation.create({
        data: {
          repositoryId: crypto.randomUUID(),
          issueId: crypto.randomUUID(),
          score: new Prisma.Decimal('0.500000'),
          rank: 1,
          reason: 'Cross-service scalar reference test',
        },
      });
      expect(issueWithoutRepositoryRow).toBeDefined();
    } finally {
      await prisma.recommendation.deleteMany({ where: { repositoryId } });
    }
  }, 30_000);
});
