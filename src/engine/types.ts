// ==========================================
// PulseBridge: AWS Event Pipeline Types
// ==========================================

export type AWSServiceType = 'EventBridge' | 'Rule' | 'SNS' | 'SQS' | 'Consumer' | 'DLQ';

/**
 * Standard AWS EventBridge Event Envelope
 */
export interface SimulationEvent {
  id: string;
  traceId: string;
  version?: string;
  account?: string;
  region?: string;
  time: string; // ISO string
  source: string; // e.g. "com.ecommerce.orders"
  detailType: string; // e.g. "OrderCreated"
  detail: Record<string, any>;
  resources?: string[];
  isReplay?: boolean;
  replayOriginalId?: string;
}

/**
 * AWS EventBridge Pattern Matcher definitions
 */
export type PatternLeafMatcher =
  | string
  | number
  | boolean
  | null
  | { prefix: string }
  | { suffix: string }
  | { 'anything-but': string | number | (string | number)[] | { prefix: string } | { suffix: string } }
  | { numeric: (string | number)[] } // e.g. [">=", 100, "<=", 500] or ["<", 50]
  | { exists: boolean };

export type EventPattern = {
  source?: (string | PatternLeafMatcher)[];
  'detail-type'?: (string | PatternLeafMatcher)[];
  detail?: Record<string, any>;
  [key: string]: any;
};

export interface MatchResult {
  matches: boolean;
  reasons: string[]; // Diagnostic explanations (especially if not matching)
}

/**
 * Target connected to an EventBridge Rule
 */
export interface RuleTarget {
  id: string;
  type: 'SNS' | 'SQS';
  targetId: string; // topic id or queue id
  inputTransformer?: {
    inputPathsMap: Record<string, string>; // e.g. {"orderId": "$.detail.id"}
    template: string; // e.g. "{\"message\": \"Order <orderId> received\"}"
  };
}

/**
 * EventBridge Rule
 */
export interface EventBridgeRule {
  id: string;
  name: string;
  description: string;
  eventBusName: string;
  state: 'ENABLED' | 'DISABLED';
  eventPattern: EventPattern;
  targets: RuleTarget[];
  createdAt: number;
}

/**
 * SNS Subscription Protocols
 */
export type SNSProtocol = 'sqs' | 'http' | 'email';

export interface SNSSubscription {
  id: string;
  topicId: string;
  protocol: SNSProtocol;
  endpoint: string; // queueId if sqs, or url/email
  filterPolicy?: Record<string, any>;
  filterPolicyScope?: 'MessageAttributes' | 'MessageBody';
  rawMessageDelivery?: boolean;
}

/**
 * SNS Topic
 */
export interface SNSTopic {
  id: string;
  arn: string;
  name: string;
  displayName?: string;
  subscriptions: SNSSubscription[];
  deliveryPolicy?: {
    maxReceives: number;
    backoffDelayMs: number;
  };
  createdAt: number;
}

/**
 * SQS Message in queue state machine
 */
export type SQSMessageState = 'delayed' | 'visible' | 'inflight' | 'deleted' | 'dlq';

export interface SQSMessage {
  id: string;
  traceId: string;
  queueId: string;
  body: any;
  messageAttributes: Record<string, { DataType: string; StringValue?: string; NumberValue?: number }>;
  messageGroupId?: string; // FIFO
  messageDeduplicationId?: string; // FIFO
  state: SQSMessageState;
  sentTimestamp: number;
  deliverAtTimestamp: number; // For delay seconds
  receiveCount: number;
  visibilityExpiresAt: number; // Timestamp when current inflight lease expires
  processingWorkerId?: string;
  isPoison?: boolean;
  history: {
    timestamp: number;
    action: string;
    detail?: string;
  }[];
}

/**
 * SQS Queue Definition
 */
export interface SQSQueue {
  id: string;
  arn: string;
  name: string;
  type: 'STANDARD' | 'FIFO';
  visibilityTimeoutSec: number; // e.g. 10s default
  delaySec: number; // 0 to 900
  retentionSec: number; // e.g. 3600
  maxReceiveCount: number; // e.g. 3
  deadLetterQueueId?: string;
  contentBasedDeduplication?: boolean; // For FIFO
  deduplicationScope?: 'messageGroup' | 'queue';
  fifoThroughputLimit?: 'perQueue' | 'perMessageGroupId';
  createdAt: number;
}

/**
 * Mock Consumer Worker
 */
export interface ConsumerWorker {
  id: string;
  name: string;
  queueId: string;
  status: 'idle' | 'polling' | 'processing' | 'failed' | 'crashed';
  concurrency: number;
  processingTimeMs: number; // baseline duration to process a message
  failureRatePct: number; // 0 to 100
  poisonPattern?: string; // regex or substring that triggers guaranteed failure
  currentMessageId?: string;
  progressPct: number; // 0 to 100
  totalProcessed: number;
  totalFailed: number;
  logs: {
    id: string;
    timestamp: number;
    level: 'info' | 'warn' | 'error';
    text: string;
  }[];
}

/**
 * Hop in Trace Record
 */
export interface TraceHop {
  id: string;
  hopIndex: number;
  timestamp: number;
  service: AWSServiceType;
  nodeId: string;
  nodeName: string;
  action: string;
  status: 'SUCCESS' | 'DROPPED' | 'FAILED' | 'RETRY' | 'DLQ' | 'PENDING';
  details: string;
  diffReason?: string;
  payloadSnapshot?: any;
}

/**
 * Complete Trace Record for an Event
 */
export interface TraceRecord {
  traceId: string;
  originalEvent: SimulationEvent;
  startTime: number;
  endTime?: number;
  hops: TraceHop[];
  status: 'DELIVERED' | 'DROPPED' | 'DLQ' | 'PROCESSING' | 'FAILED';
}

/**
 * Chaos Injection Configuration
 */
export interface ChaosConfig {
  crashedWorkerIds: string[];
  injectedLatencyMs: number;
  throttledQueueIds: Record<string, number>; // queueId -> throttle % (0-100)
  snsDeliveryDropRate: number; // 0 - 100%
  partitionedSubscriptionIds: string[];
  activePreset?: 'black_friday' | 'cascading_failure' | 'poison_onslaught' | null;
}

/**
 * Live Canvas Moving Particle
 */
export interface CanvasParticle {
  id: string;
  traceId: string;
  fromNodeId: string;
  toNodeId: string;
  progress: number; // 0 to 1
  speed: number; // increment per tick
  color: string;
  status: 'normal' | 'retry' | 'failed' | 'replay';
  eventSummary: string;
}

/**
 * Simulation Clock State
 */
export interface SimClockState {
  isRunning: boolean;
  speed: 0.5 | 1 | 2 | 5 | 10;
  tickCount: number;
  simTimeMs: number; // Virtual elapsed time
}

