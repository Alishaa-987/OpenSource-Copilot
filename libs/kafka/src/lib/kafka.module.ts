import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { TypedConfigService } from '@osc/config';
import { buildKafkaConfig, KafkaConnectionOptions, KafkaSaslOptions } from './kafka.config';
import { KAFKA_CLIENT, KAFKA_MODULE_OPTIONS, KafkaModuleOptions } from './kafka.constants';
import { KafkaProducerService } from './kafka.producer';
import { KafkaConsumerService } from './kafka.consumer';

export interface KafkaModuleForRootOptions {
  /** Logical producer identity stamped on event envelopes (usually the service name). */
  producerName: string;
}

/** Derives kafkajs connection options from validated config (no defaults/secrets baked in). */
function connectionFromConfig(config: TypedConfigService): KafkaConnectionOptions {
  const mechanism = config.get('KAFKA_SASL_MECHANISM') as KafkaSaslOptions['mechanism'] | undefined;
  const username = config.get('KAFKA_SASL_USERNAME') as string | undefined;
  const password = config.get('KAFKA_SASL_PASSWORD') as string | undefined;
  const sasl =
    mechanism && username && password ? { mechanism, username, password } : undefined;

  return {
    brokers: config.get('KAFKA_BROKERS') as string[],
    clientId: config.get('KAFKA_CLIENT_ID') as string,
    ssl: config.get('KAFKA_SSL') as boolean | undefined,
    sasl,
  };
}

/**
 * Provides a shared kafkajs client plus producer/consumer services, wired from
 * validated env. `producerName` is supplied per service so event envelopes are
 * attributable to their origin.
 */
@Global()
@Module({})
export class KafkaModule {
  static forRoot(options: KafkaModuleForRootOptions): DynamicModule {
    const moduleOptionsProvider: Provider = {
      provide: KAFKA_MODULE_OPTIONS,
      useFactory: (config: TypedConfigService): KafkaModuleOptions => ({
        producerName: options.producerName,
        consumerGroup: config.get('KAFKA_CONSUMER_GROUP') as string | undefined,
      }),
      inject: [TypedConfigService],
    };

    const clientProvider: Provider = {
      provide: KAFKA_CLIENT,
      useFactory: (config: TypedConfigService): Kafka =>
        new Kafka(buildKafkaConfig(connectionFromConfig(config))),
      inject: [TypedConfigService],
    };

    return {
      module: KafkaModule,
      providers: [
        moduleOptionsProvider,
        clientProvider,
        KafkaProducerService,
        KafkaConsumerService,
      ],
      exports: [KafkaProducerService, KafkaConsumerService, KAFKA_CLIENT],
    };
  }
}
