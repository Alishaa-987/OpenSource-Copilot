import { PrismaService } from './prisma.service';

const integration = process.env['RUN_INTEGRATION'] === '1' ? it : it.skip;

describe('repository-service Prisma data model', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  }, 30_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  integration('enforces provider and association uniqueness', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const githubUserId = BigInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    const githubRepositoryId = BigInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    let userId: string | undefined;
    let repositoryId: string | undefined;

    try {
      const user = await prisma.user.create({
        data: {
          githubUserId,
          username: `constraint-user-${suffix}`,
          displayName: 'Constraint Test User',
        },
      });
      userId = user.id;

      const repository = await prisma.repository.create({
        data: {
          githubRepositoryId,
          owner: 'constraint-owner',
          name: `constraint-repository-${suffix}`,
          fullName: `constraint-owner/constraint-repository-${suffix}`,
          url: 'https://github.com/constraint-owner/constraint-repository',
          defaultBranch: 'main',
        },
      });
      repositoryId = repository.id;

      await expect(
        prisma.repository.create({
          data: {
            githubRepositoryId,
            owner: 'other-owner',
            name: `other-repository-${suffix}`,
            fullName: `other-owner/other-repository-${suffix}`,
            url: 'https://github.com/other-owner/other-repository',
            defaultBranch: 'main',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });

      await prisma.repositoryAccess.create({
        data: { userId: user.id, repositoryId: repository.id, accessLevel: 'read' },
      });

      await expect(
        prisma.repositoryAccess.create({
          data: { userId: user.id, repositoryId: repository.id, accessLevel: 'write' },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });

      await prisma.repositoryDocument.create({
        data: {
          repositoryId: repository.id,
          documentType: 'markdown',
          path: 'README.md',
          content: '# Constraint test',
          sha: 'constraint-sha-1',
        },
      });

      await expect(
        prisma.repositoryDocument.create({
          data: {
            repositoryId: repository.id,
            documentType: 'markdown',
            path: 'README.md',
            content: '# Duplicate path',
            sha: 'constraint-sha-2',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    } finally {
      if (repositoryId) {
        await prisma.repository.delete({ where: { id: repositoryId } }).catch(() => undefined);
      }
      if (userId) {
        await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
      }
    }
  }, 30_000);

  integration('cascades repository-owned records when a repository is deleted', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const repository = await prisma.repository.create({
      data: {
        githubRepositoryId: BigInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        owner: 'cascade-owner',
        name: `cascade-repository-${suffix}`,
        fullName: `cascade-owner/cascade-repository-${suffix}`,
        url: 'https://github.com/cascade-owner/cascade-repository',
        defaultBranch: 'main',
      },
    });
    const user = await prisma.user.create({
      data: {
        githubUserId: BigInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        username: `cascade-user-${suffix}`,
      },
    });

    try {
      await prisma.repositoryAccess.create({
        data: { userId: user.id, repositoryId: repository.id, accessLevel: 'admin' },
      });
      await prisma.repositoryDocument.create({
        data: {
          repositoryId: repository.id,
          documentType: 'source',
          path: 'src/index.ts',
          content: 'export {};',
          sha: 'cascade-sha',
        },
      });
      const issue = await prisma.issue.create({
        data: {
          repositoryId: repository.id,
          githubIssueId: BigInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
          number: 1,
          title: 'Cascade issue',
          state: 'open',
          url: 'https://github.com/cascade-owner/cascade-repository/issues/1',
        },
      });
      await prisma.issueLabel.create({
        data: { issueId: issue.id, name: 'phase1', color: '0366d6' },
      });

      await prisma.repository.delete({ where: { id: repository.id } });

      expect(await prisma.repositoryAccess.count({ where: { repositoryId: repository.id } })).toBe(0);
      expect(await prisma.repositoryDocument.count({ where: { repositoryId: repository.id } })).toBe(0);
      expect(await prisma.issue.count({ where: { repositoryId: repository.id } })).toBe(0);
      expect(await prisma.issueLabel.count({ where: { issueId: issue.id } })).toBe(0);
    } finally {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      await prisma.repository.delete({ where: { id: repository.id } }).catch(() => undefined);
    }
  }, 30_000);
});
