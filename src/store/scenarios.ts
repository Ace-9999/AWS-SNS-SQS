import {
  ConsumerWorker,
  EventBridgeRule,
  SNSTopic,
  SQSQueue,
} from '../engine/types';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rules: EventBridgeRule[];
  topics: SNSTopic[];
  queues: SQSQueue[];
  workers: ConsumerWorker[];
  sampleEvents: {
    name: string;
    description: string;
    payload: {
      source: string;
      detailType: string;
      detail: Record<string, any>;
    };
  }[];
}

export const PRESET_SCENARIOS: Record<string, ScenarioDefinition> = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce Order Processing',
    description: 'Order checkout flow with VIP fan-out, fulfillment workers, poison pill handling, and DLQ spillover.',
    icon: 'ShoppingCart',
    topics: [
      {
        id: 'topic-orders',
        arn: 'arn:aws:sns:us-east-1:123456789012:OrderEventsTopic',
        name: 'OrderEventsTopic',
        displayName: 'Orders Fan-Out Topic',
        subscriptions: [
          {
            id: 'sub-fulfillment',
            topicId: 'topic-orders',
            protocol: 'sqs',
            endpoint: 'queue-fulfillment',
            // No filter: gets all orders
          },
          {
            id: 'sub-vip',
            topicId: 'topic-orders',
            protocol: 'sqs',
            endpoint: 'queue-vip-orders',
            filterPolicyScope: 'MessageAttributes',
            filterPolicy: {
              customer_tier: ['VIP', 'PLATINUM'],
            },
          },
          {
            id: 'sub-webhook',
            topicId: 'topic-orders',
            protocol: 'http',
            endpoint: 'https://warehouse-partner.internal/hooks/order',
          },
        ],
        createdAt: Date.now(),
      },
    ],
    queues: [
      {
        id: 'queue-fulfillment',
        arn: 'arn:aws:sqs:us-east-1:123456789012:fulfillment-queue',
        name: 'fulfillment-queue',
        type: 'STANDARD',
        visibilityTimeoutSec: 8,
        delaySec: 0,
        retentionSec: 3600,
        maxReceiveCount: 3,
        deadLetterQueueId: 'queue-fulfillment-dlq',
        createdAt: Date.now(),
      },
      {
        id: 'queue-fulfillment-dlq',
        arn: 'arn:aws:sqs:us-east-1:123456789012:fulfillment-queue-dlq',
        name: 'fulfillment-queue-dlq',
        type: 'STANDARD',
        visibilityTimeoutSec: 30,
        delaySec: 0,
        retentionSec: 86400,
        maxReceiveCount: 5,
        createdAt: Date.now(),
      },
      {
        id: 'queue-vip-orders',
        arn: 'arn:aws:sqs:us-east-1:123456789012:vip-orders.fifo',
        name: 'vip-orders.fifo',
        type: 'FIFO',
        visibilityTimeoutSec: 6,
        delaySec: 0,
        retentionSec: 7200,
        maxReceiveCount: 2,
        deadLetterQueueId: 'queue-vip-dlq',
        contentBasedDeduplication: true,
        createdAt: Date.now(),
      },
      {
        id: 'queue-vip-dlq',
        arn: 'arn:aws:sqs:us-east-1:123456789012:vip-orders-dlq.fifo',
        name: 'vip-orders-dlq.fifo',
        type: 'FIFO',
        visibilityTimeoutSec: 30,
        delaySec: 0,
        retentionSec: 86400,
        maxReceiveCount: 5,
        createdAt: Date.now(),
      },
      {
        id: 'queue-audit',
        arn: 'arn:aws:sqs:us-east-1:123456789012:payment-failures-queue',
        name: 'payment-failures-queue',
        type: 'STANDARD',
        visibilityTimeoutSec: 10,
        delaySec: 0,
        retentionSec: 3600,
        maxReceiveCount: 3,
        createdAt: Date.now(),
      },
    ],
    rules: [
      {
        id: 'rule-order-created',
        name: 'OrderCreatedRule',
        description: 'Routes all OrderCreated events to SNS OrderEventsTopic for fan-out',
        eventBusName: 'default',
        state: 'ENABLED',
        eventPattern: {
          source: ['com.ecommerce.orders'],
          'detail-type': ['OrderCreated'],
        },
        targets: [
          {
            id: 'tgt-sns-orders',
            type: 'SNS',
            targetId: 'topic-orders',
          },
        ],
        createdAt: Date.now(),
      },
      {
        id: 'rule-payment-failed',
        name: 'PaymentFailureAuditRule',
        description: 'Directly routes critical PaymentFailed events to SQS payment-failures-queue',
        eventBusName: 'default',
        state: 'ENABLED',
        eventPattern: {
          source: ['com.ecommerce.payments'],
          'detail-type': ['PaymentFailed'],
          detail: {
            reason: [{ 'anything-but': 'USER_CANCELLED' }],
          },
        },
        targets: [
          {
            id: 'tgt-sqs-fraud',
            type: 'SQS',
            targetId: 'queue-audit',
          },
        ],
        createdAt: Date.now(),
      },
    ],
    workers: [
      {
        id: 'worker-fulfill-1',
        name: 'Fulfillment Worker 01',
        queueId: 'queue-fulfillment',
        status: 'idle',
        concurrency: 1,
        processingTimeMs: 1500,
        failureRatePct: 15,
        poisonPattern: 'CORRUPTED',
        progressPct: 0,
        totalProcessed: 0,
        totalFailed: 0,
        logs: [],
      },
      {
        id: 'worker-fulfill-2',
        name: 'Fulfillment Worker 02',
        queueId: 'queue-fulfillment',
        status: 'idle',
        concurrency: 1,
        processingTimeMs: 1800,
        failureRatePct: 10,
        poisonPattern: 'CORRUPTED',
        progressPct: 0,
        totalProcessed: 0,
        totalFailed: 0,
        logs: [],
      },
      {
        id: 'worker-vip-fifo',
        name: 'VIP Dedicated Worker',
        queueId: 'queue-vip-orders',
        status: 'idle',
        concurrency: 1,
        processingTimeMs: 1000,
        failureRatePct: 0,
        progressPct: 0,
        totalProcessed: 0,
        totalFailed: 0,
        logs: [],
      },
    ],
    sampleEvents: [
      {
        name: 'Standard Order',
        description: 'Standard retail checkout ($89.50) processed through normal fulfillment',
        payload: {
          source: 'com.ecommerce.orders',
          detailType: 'OrderCreated',
          detail: {
            orderId: 'ord-84210',
            amount: 89.5,
            currency: 'USD',
            customerTier: 'STANDARD',
            items: ['Wireless Mouse', 'USB-C Cable'],
            shippingAddress: { city: 'Seattle', state: 'WA' },
          },
        },
      },
      {
        name: 'VIP High-Value Order',
        description: 'VIP Gold member checkout ($1,299) routing to both general and VIP FIFO queue',
        payload: {
          source: 'com.ecommerce.orders',
          detailType: 'OrderCreated',
          detail: {
            orderId: 'ord-99001',
            amount: 1299.0,
            currency: 'USD',
            customerTier: 'VIP',
            items: ['MacBook Pro M4', 'AppleCare+'],
            shippingAddress: { city: 'New York', state: 'NY' },
          },
        },
      },
      {
        name: 'Poison Pill Order',
        description: 'Corrupted payload that triggers simulated worker crashes and DLQ escalation',
        payload: {
          source: 'com.ecommerce.orders',
          detailType: 'OrderCreated',
          detail: {
            orderId: 'ord-CORRUPTED-999',
            amount: 49.0,
            currency: 'USD',
            customerTier: 'STANDARD',
            items: ['Unknown Item (Payload Corrupted)'],
            status: 'CORRUPTED',
          },
        },
      },
      {
        name: 'Payment System Alert',
        description: 'Gateway failure alert triggering direct SQS payment audit rule',
        payload: {
          source: 'com.ecommerce.payments',
          detailType: 'PaymentFailed',
          detail: {
            transactionId: 'txn-55419',
            amount: 320.0,
            reason: 'GATEWAY_TIMEOUT',
            cardBrand: 'VISA',
          },
        },
      },
    ],
  },

  iot: {
    id: 'iot',
    name: 'IoT Smart City Telemetry',
    description: 'City sensors broadcasting temperature and AQI, triggering emergency topics and alert queues.',
    icon: 'Radio',
    topics: [
      {
        id: 'topic-critical-alerts',
        arn: 'arn:aws:sns:us-east-1:123456789012:CriticalAlertsTopic',
        name: 'CriticalAlertsTopic',
        displayName: 'Emergency Alert Broadcast',
        subscriptions: [
          {
            id: 'sub-emergency-sqs',
            topicId: 'topic-critical-alerts',
            protocol: 'sqs',
            endpoint: 'queue-emergency-response',
          },
          {
            id: 'sub-pagerduty',
            topicId: 'topic-critical-alerts',
            protocol: 'http',
            endpoint: 'https://pagerduty.mock/iot-incident',
          },
        ],
        createdAt: Date.now(),
      },
    ],
    queues: [
      {
        id: 'queue-emergency-response',
        arn: 'arn:aws:sqs:us-east-1:123456789012:emergency-response-queue',
        name: 'emergency-response-queue',
        type: 'STANDARD',
        visibilityTimeoutSec: 10,
        delaySec: 0,
        retentionSec: 3600,
        maxReceiveCount: 3,
        deadLetterQueueId: 'queue-emergency-dlq',
        createdAt: Date.now(),
      },
      {
        id: 'queue-emergency-dlq',
        arn: 'arn:aws:sqs:us-east-1:123456789012:emergency-dlq',
        name: 'emergency-dlq',
        type: 'STANDARD',
        visibilityTimeoutSec: 30,
        delaySec: 0,
        retentionSec: 86400,
        maxReceiveCount: 5,
        createdAt: Date.now(),
      },
      {
        id: 'queue-telemetry-archive',
        arn: 'arn:aws:sqs:us-east-1:123456789012:telemetry-archive.fifo',
        name: 'telemetry-archive.fifo',
        type: 'FIFO',
        visibilityTimeoutSec: 5,
        delaySec: 0,
        retentionSec: 7200,
        maxReceiveCount: 3,
        contentBasedDeduplication: true,
        createdAt: Date.now(),
      },
    ],
    rules: [
      {
        id: 'rule-high-temp',
        name: 'ExtremeTemperatureAlertRule',
        description: 'Triggers emergency broadcast if sensor temperature exceeds 90°C',
        eventBusName: 'default',
        state: 'ENABLED',
        eventPattern: {
          source: ['city.iot.sensors'],
          'detail-type': ['TelemetryReport'],
          detail: {
            temperature: [{ numeric: ['>=', 90] }],
          },
        },
        targets: [
          {
            id: 'tgt-emergency-topic',
            type: 'SNS',
            targetId: 'topic-critical-alerts',
          },
        ],
        createdAt: Date.now(),
      },
      {
        id: 'rule-telemetry-all',
        name: 'TelemetryArchiveRule',
        description: 'Routes all sensor data to FIFO archive queue for historical analysis',
        eventBusName: 'default',
        state: 'ENABLED',
        eventPattern: {
          source: ['city.iot.sensors'],
          'detail-type': ['TelemetryReport'],
        },
        targets: [
          {
            id: 'tgt-telemetry-fifo',
            type: 'SQS',
            targetId: 'queue-telemetry-archive',
          },
        ],
        createdAt: Date.now(),
      },
    ],
    workers: [
      {
        id: 'worker-emergency-1',
        name: 'Emergency Dispatch Worker',
        queueId: 'queue-emergency-response',
        status: 'idle',
        concurrency: 1,
        processingTimeMs: 1200,
        failureRatePct: 5,
        progressPct: 0,
        totalProcessed: 0,
        totalFailed: 0,
        logs: [],
      },
      {
        id: 'worker-telemetry-1',
        name: 'Telemetry Ingest Worker',
        queueId: 'queue-telemetry-archive',
        status: 'idle',
        concurrency: 1,
        processingTimeMs: 800,
        failureRatePct: 0,
        progressPct: 0,
        totalProcessed: 0,
        totalFailed: 0,
        logs: [],
      },
    ],
    sampleEvents: [
      {
        name: 'Normal Sensor Reading',
        description: 'Normal temperature (28°C) and AQI reading',
        payload: {
          source: 'city.iot.sensors',
          detailType: 'TelemetryReport',
          detail: {
            sensorId: 'sensor-grid-east-41',
            temperature: 28.4,
            aqi: 45,
            batteryPct: 98,
            location: 'Downtown Square',
          },
        },
      },
      {
        name: 'Critical Temperature Spike',
        description: 'Substation heat alert (96°C) exceeding emergency threshold',
        payload: {
          source: 'city.iot.sensors',
          detailType: 'TelemetryReport',
          detail: {
            sensorId: 'substation-north-09',
            temperature: 96.2,
            aqi: 80,
            batteryPct: 84,
            location: 'Industrial Grid',
          },
        },
      },
    ],
  },

  fraud: {
    id: 'fraud',
    name: 'Financial Fraud Detection & Anomalies',
    description: 'Transaction authorization stream evaluated against velocity thresholds and fraud review queues.',
    icon: 'ShieldAlert',
    topics: [
      {
        id: 'topic-fraud-alerts',
        arn: 'arn:aws:sns:us-east-1:123456789012:FraudAlertsTopic',
        name: 'FraudAlertsTopic',
        displayName: 'Suspicious Activity Topic',
        subscriptions: [
          {
            id: 'sub-fraud-queue',
            topicId: 'topic-fraud-alerts',
            protocol: 'sqs',
            endpoint: 'queue-fraud-investigation',
          },
        ],
        createdAt: Date.now(),
      },
    ],
    queues: [
      {
        id: 'queue-fraud-investigation',
        arn: 'arn:aws:sqs:us-east-1:123456789012:fraud-investigation-queue',
        name: 'fraud-investigation-queue',
        type: 'STANDARD',
        visibilityTimeoutSec: 15,
        delaySec: 0,
        retentionSec: 7200,
        maxReceiveCount: 3,
        deadLetterQueueId: 'queue-fraud-dlq',
        createdAt: Date.now(),
      },
      {
        id: 'queue-fraud-dlq',
        arn: 'arn:aws:sqs:us-east-1:123456789012:fraud-dlq',
        name: 'fraud-dlq',
        type: 'STANDARD',
        visibilityTimeoutSec: 30,
        delaySec: 0,
        retentionSec: 86400,
        maxReceiveCount: 5,
        createdAt: Date.now(),
      },
    ],
    rules: [
      {
        id: 'rule-high-risk-txn',
        name: 'HighRiskTransactionRule',
        description: 'Matches transactions with risk score >= 80 or amount >= 10000',
        eventBusName: 'default',
        state: 'ENABLED',
        eventPattern: {
          source: ['fintech.banking.core'],
          'detail-type': ['TransactionAuthorized'],
          detail: {
            riskScore: [{ numeric: ['>=', 80] }],
          },
        },
        targets: [
          {
            id: 'tgt-fraud-topic',
            type: 'SNS',
            targetId: 'topic-fraud-alerts',
          },
        ],
        createdAt: Date.now(),
      },
    ],
    workers: [
      {
        id: 'worker-fraud-analyst',
        name: 'Automated Fraud Analyzer',
        queueId: 'queue-fraud-investigation',
        status: 'idle',
        concurrency: 1,
        processingTimeMs: 2500,
        failureRatePct: 20,
        progressPct: 0,
        totalProcessed: 0,
        totalFailed: 0,
        logs: [],
      },
    ],
    sampleEvents: [
      {
        name: 'Routine Grocery Card Swipe',
        description: 'Standard $42 swipe with risk score 5',
        payload: {
          source: 'fintech.banking.core',
          detailType: 'TransactionAuthorized',
          detail: {
            txId: 'tx-817294',
            amount: 42.15,
            merchant: 'Whole Foods Market',
            riskScore: 5,
            cardCountry: 'US',
          },
        },
      },
      {
        name: 'Suspicious Cross-Border Transfer',
        description: 'Wire transfer with risk score 88 triggering fraud alert',
        payload: {
          source: 'fintech.banking.core',
          detailType: 'TransactionAuthorized',
          detail: {
            txId: 'tx-999412',
            amount: 14500.0,
            merchant: 'Offshore Exchange',
            riskScore: 88,
            cardCountry: 'KY',
          },
        },
      },
    ],
  },
};

