// Repair: undo the mass "closed" marking done by the repository monitor.
//
// Why this is safe: the import path only ever stores OPEN issues
// (fetchIssues is called with state: 'open'), so every row in this table was
// open when it was written. Anything now marked closed was closed by the
// monitor's sweep, not by GitHub. Restoring them to open returns the table to
// what the import actually saw; a genuinely closed issue will be corrected on
// the next authenticated sync/re-import.
//
// Run from the project root:
//   node -r dotenv/config _repair_issues.js > repair.txt 2>&1
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.issue.groupBy({ by: ['state'], _count: { _all: true } });
  console.log('before:', JSON.stringify(before.map((r) => ({ state: r.state, count: r._count._all }))));

  const reopened = await prisma.issue.updateMany({
    where: { state: 'closed' },
    data: { state: 'open', closedAt: null },
  });
  console.log(`reopened ${reopened.count} issue row(s)`);

  // The same sweep generated one notification per issue. Those events never
  // happened, so they are removed rather than left in the bell.
  const removed = await prisma.notification.deleteMany({ where: { type: 'issue_closed' } });
  console.log(`removed ${removed.count} bogus "issue closed" notification(s)`);

  const after = await prisma.issue.groupBy({ by: ['state'], _count: { _all: true } });
  console.log('after:', JSON.stringify(after.map((r) => ({ state: r.state, count: r._count._all }))));
  console.log('remaining notifications:', await prisma.notification.count());
}

main()
  .catch((error) => { console.error('REPAIR FAILED:', error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
