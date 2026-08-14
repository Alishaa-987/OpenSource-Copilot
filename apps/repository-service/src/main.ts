import { bootstrapService } from '@osc/shared';
import { AppModule } from './app/app.module';

const port = Number.parseInt(process.env['PORT'] ?? '3001', 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

void bootstrapService(AppModule, {
  serviceName: 'repository-service',
  port,
});

