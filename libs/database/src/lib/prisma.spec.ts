// A syntactically valid URL is enough to construct PrismaClient; no connection
// is attempted in these unit tests (that is covered by the integration suite).
process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] ?? 'postgresql://user:pass@localhost:5432/db';

import { PrismaService } from './prisma.service';
import { PrismaModule } from './prisma.module';

describe('PrismaService', () => {
  it('is a PrismaClient with lifecycle hooks and a ping probe', () => {
    const service = new PrismaService();
    expect(typeof service.$connect).toBe('function');
    expect(typeof service.$disconnect).toBe('function');
    expect(typeof service.onModuleInit).toBe('function');
    expect(typeof service.onModuleDestroy).toBe('function');
    expect(typeof service.ping).toBe('function');
  });
});

describe('PrismaModule', () => {
  it('is defined', () => {
    expect(PrismaModule).toBeDefined();
  });
});
