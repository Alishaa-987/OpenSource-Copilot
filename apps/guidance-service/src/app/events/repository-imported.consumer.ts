import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import {
  parseRepositoryImportedEvent,
  RepositoryImportedEvent,
  REPOSITORY_IMPORTED_TOPIC,
} from '@osc/contracts';
import { KafkaConsumerService } from '@osc/kafka';
import { getCorrelationId } from '@osc/observability';
import { GuidanceEnv } from '../env';
import { GuidancePrismaService } from '../database/guidance-prisma.service';

@Injectable()
export class RepositoryImportedConsumer implements OnModuleInit {
  private readonly logger = new Logger(RepositoryImportedConsumer.name);

  constructor(
    private readonly kafka: KafkaConsumerService,
    private readonly prisma: GuidancePrismaService,
    private readonly config: TypedConfigService<GuidanceEnv>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.kafka.consumeRaw<RepositoryImportedEvent>(
      {
        topics: [REPOSITORY_IMPORTED_TOPIC],
        groupId: this.config.get('KAFKA_CONSUMER_GROUP'),
        fromBeginning: this.config.get('KAFKA_CONSUMER_FROM_BEGINNING'),
        maxAttempts: this.config.get('KAFKA_CONSUMER_MAX_ATTEMPTS'),
        retryDelayMs: this.config.get('KAFKA_CONSUMER_RETRY_DELAY_MS'),
      },
      (event) => this.handle(event),
      parseRepositoryImportedEvent,
    );
  }

  async handle(event: RepositoryImportedEvent): Promise<void> {
    const correlationId = getCorrelationId() ?? event.correlationId;
    this.logger.log(JSON.stringify({ event: 'repository-imported-received', eventId: event.eventId, repositoryId: event.repositoryId, githubRepositoryId: event.githubRepositoryId, correlationId }));

    const processed = await this.prisma.$transaction(async (tx) => {
      try {
        await tx.processedEvent.create({
          data: {
            eventId: event.eventId,
            eventType: event.eventType,
            version: event.version,
            correlationId,
          },
        });
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          return false;
        }
        throw error;
      }

      await tx.importedRepositoryProjection.upsert({
        where: { repositoryId: event.repositoryId },
        create: {
          repositoryId: event.repositoryId,
          githubRepositoryId: event.githubRepositoryId,
          lastImportedAt: new Date(event.timestamp),
          lastCorrelationId: correlationId,
        },
        update: {
          githubRepositoryId: event.githubRepositoryId,
          lastImportedAt: new Date(event.timestamp),
          lastCorrelationId: correlationId,
        },
      });
      return true;
    });

    if (!processed) {
      this.logger.log(JSON.stringify({ event: 'repository-imported-duplicate', eventId: event.eventId, repositoryId: event.repositoryId, correlationId }));
      return;
    }
    this.logger.log(JSON.stringify({ event: 'repository-imported-processed', eventId: event.eventId, repositoryId: event.repositoryId, correlationId }));
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
