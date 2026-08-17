# Database Documentation

## Ownership

Repository Service owns `apps/repository-service/prisma/schema.prisma` and its PostgreSQL database. It owns users, installations, repositories, access entries, documents, issues, and labels. Guidance Service owns `apps/guidance-service/prisma/schema.prisma` and its separate PostgreSQL database. It owns recommendations, processed event IDs, and its imported repository projection. No application imports the other service's Prisma module.

## Internal and external identifiers

All primary keys are internal UUIDs. GitHub user, installation, repository, and issue identifiers are stored in separate fields with uniqueness constraints appropriate to their owner. This prevents an external identifier from becoming an internal identity boundary.

## Important constraints and indexes

Repository access is unique per user/repository pair. Repository GitHub IDs are unique. Issue GitHub IDs are unique within a repository and issue numbers are unique within a repository. Documents are unique per repository/path. Labels are unique per issue/name. Foreign keys use cascading cleanup for child records that cannot exist without their parent. Query indexes support user repository access, repository issue listing, recommendation listing, GitHub ID lookup, and document lookup.

## Migrations

Use the project scripts with the intended local database only: `npm run prisma:repository:validate`, `npm run prisma:repository:deploy`, `npm run prisma:guidance:validate`, and `npm run prisma:guidance:deploy`. Generate clients after schema changes with the matching Prisma schema. Migration status must be checked before and after deployment. Do not apply unrelated migrations or use production credentials during local development.

## Test coverage

Database tests run against the guarded local infrastructure when `RUN_INTEGRATION=1`. They cover Prisma connectivity and important uniqueness/association constraints. Unit tests use mocks or isolated service behavior and do not silently replace integration coverage.
