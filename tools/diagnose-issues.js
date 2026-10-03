// Diagnostic: why does a repository show "No open issues"?
// Run from the project root:  node -r dotenv/config _diag_issues.js > issues-diag.txt 2>&1
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const repositories = await prisma.repository.findMany({
    where: { accessEntries: { some: {} } },
    select: {
      id: true,
      fullName: true,
      isFork: true,
      parentFullName: true,
      openIssuesCount: true,
      lastSyncedAt: true,
      lastIssueCheckAt: true,
      _count: { select: { issues: true, accessEntries: true } },
    },
  });

  console.log('=== REPOSITORIES (imported) ===');
  for (const repository of repositories) {
    console.log(JSON.stringify({
      id: repository.id,
      fullName: repository.fullName,
      isFork: repository.isFork,
      parentFullName: repository.parentFullName,
      githubOpenIssuesCount: repository.openIssuesCount,
      storedIssueRows: repository._count.issues,
      accessEntries: repository._count.accessEntries,
      lastSyncedAt: repository.lastSyncedAt,
      lastIssueCheckAt: repository.lastIssueCheckAt,
    }));

    const byState = await prisma.issue.groupBy({
      by: ['state', 'isUpstream'],
      where: { repositoryId: repository.id },
      _count: { _all: true },
    });
    console.log('   issue rows by state:', JSON.stringify(byState.map((row) => ({
      state: row.state,
      isUpstream: row.isUpstream,
      count: row._count._all,
    }))));

    const sample = await prisma.issue.findMany({
      where: { repositoryId: repository.id },
      select: { number: true, title: true, state: true, isUpstream: true, closedAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
    console.log('   newest 5 rows:', JSON.stringify(sample));
    console.log('');
  }

  console.log('=== NEW TABLES PRESENT? ===');
  for (const [label, probe] of [
    ['issue_progress', () => prisma.issueProgress.count()],
    ['contributor_activity', () => prisma.contributorActivity.count()],
    ['notifications', () => prisma.notification.count()],
  ]) {
    try {
      console.log(`${label}: OK, rows = ${await probe()}`);
    } catch (error) {
      console.log(`${label}: FAILING -> ${error.message.split('\n')[0]}`);
    }
  }
}

main()
  .catch((error) => { console.error('DIAG FAILED:', error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
