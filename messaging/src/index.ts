import { Kafka, type Consumer, type Producer } from "kafkajs";
import type { PlatformEvent } from "@iag/events";

export interface MessagingClientOptions {
  brokers: string[];
  clientId: string;
}

export interface EventPublisher {
  publish<T>(topic: string, event: PlatformEvent<T>, key?: string): Promise<void>;
  disconnect(): Promise<void>;
}

export interface EventSubscriber {
  subscribe(
    topics: string[],
    handler: (event: PlatformEvent, meta: { topic: string }) => Promise<void>,
  ): Promise<void>;
  disconnect(): Promise<void>;
}

export function createMessagingClient(options: MessagingClientOptions) {
  const kafka = new Kafka({
    clientId: options.clientId,
    brokers: options.brokers,
  });

  let producer: Producer | null = null;
  let consumer: Consumer | null = null;

  async function getProducer(): Promise<Producer> {
    if (!producer) {
      producer = kafka.producer();
      await producer.connect();
    }
    return producer;
  }

  const publisher: EventPublisher = {
    async publish(topic, event, key) {
      const p = await getProducer();
      await p.send({
        topic,
        messages: [
          {
            key: key ?? event.id,
            value: JSON.stringify(event),
            headers: {
              type: event.type,
              source: event.source,
            },
          },
        ],
      });
    },
    async disconnect() {
      if (producer) {
        await producer.disconnect();
        producer = null;
      }
    },
  };

  return {
    publisher,
    async createSubscriber(groupId: string): Promise<EventSubscriber> {
      consumer = kafka.consumer({ groupId });
      await consumer.connect();

      return {
        async subscribe(topics, handler) {
          if (!consumer) throw new Error("Consumer not initialized");
          for (const topic of topics) {
            await consumer.subscribe({ topic, fromBeginning: false });
          }
          await consumer.run({
            eachMessage: async ({ topic, message }) => {
              if (!message.value) return;
              const event = JSON.parse(
                message.value.toString(),
              ) as PlatformEvent;
              await handler(event, { topic });
            },
          });
        },
        async disconnect() {
          if (consumer) {
            await consumer.disconnect();
            consumer = null;
          }
        },
      };
    },
    async disconnect() {
      await publisher.disconnect();
      if (consumer) {
        await consumer.disconnect();
        consumer = null;
      }
    },
  };
}
