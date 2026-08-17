import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TypedConfigService } from '@osc/config';
import { parseRepositoryImportedEvent, RepositoryImportedEvent, REPOSITORY_IMPORTED_TOPIC } from '@osc/contracts';
import { KafkaConsumerService } from '@osc/kafka';
import { KnowledgeEnv } from '../env';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';

@Injectable()
export class RepositoryImportedConsumer implements OnModuleInit {
  private readonly logger = new Logger(RepositoryImportedConsumer.name);
  constructor(private readonly kafka: KafkaConsumerService, private readonly config: TypedConfigService<KnowledgeEnv>, private readonly ingestion: KnowledgeIngestionService) {}
  onModuleInit() {
    void this.kafka.consumeRaw<RepositoryImportedEvent>({ topics: [REPOSITORY_IMPORTED_TOPIC], groupId: this.config.get('KAFKA_CONSUMER_GROUP'), fromBeginning: this.config.get('KAFKA_CONSUMER_FROM_BEGINNING'), maxAttempts: this.config.get('KAFKA_CONSUMER_MAX_ATTEMPTS') }, async (event) => {
      await this.ingestion.indexRepository(event.repositoryId);
      this.logger.log(JSON.stringify({ event: 'repository-imported-indexed', repositoryId: event.repositoryId, eventId: event.eventId, correlationId: event.correlationId }));
    }, parseRepositoryImportedEvent).catch((error: unknown) => {
      this.logger.error(JSON.stringify({ event: 'knowledge-consumer-start-failed', error: error instanceof Error ? error.message : String(error) }));
    });
  }
}
