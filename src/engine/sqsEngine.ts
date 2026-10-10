import { SQSMessage, SQSQueue } from './types';

/**
 * In-memory deduplication tracker for FIFO queues:
 * Map of queueId -> Map of deduplicationKey -> timestamp
 */
export class FIFODeduplicationCache {
  private cache: Map<string, Map<string, number>> = new Map();
  private readonly WINDOW_MS = 300_000; // 5 minutes standard AWS deduplication window

  public checkAndRegister(queueId: string, dedupKey: string, now: number): boolean {
    let queueMap = this.cache.get(queueId);
    if (!queueMap) {
      queueMap = new Map();
      this.cache.set(queueId, queueMap);
    }

    // Clean expired entries
    for (const [key, timestamp] of queueMap.entries()) {
      if (now - timestamp > this.WINDOW_MS) {
        queueMap.delete(key);
      }
    }

    if (queueMap.has(dedupKey)) {
      return false; // Duplicate detected!
    }

    queueMap.set(dedupKey, now);
    return true; // Successfully registered
  }

  public clear(queueId?: string) {
    if (queueId) {
      this.cache.delete(queueId);
    } else {
      this.cache.clear();
    }
  }
}

export const fifoDedupCache = new FIFODeduplicationCache();

/**
 * Computes a simple deterministic hash for content-based deduplication
 */
export function computeContentHash(content: any): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'cb-' + Math.abs(hash).toString(16);
}

/**
 * SQS Engine: Handles message lifecycle, FIFO grouping, visibility timeout ticking,
 * and DLQ transitions.
 */
export class SQSEngine {
  /**
   * Enqueues a message to a queue, evaluating delay and FIFO deduplication.
   */
  public static enqueueMessage(
    queue: SQSQueue,
    messagePayload: {
      id?: string;
      traceId: string;
      body: any;
      attributes?: Record<string, any>;
      messageGroupId?: string;
      messageDeduplicationId?: string;
      delaySeconds?: number;
      isPoison?: boolean;
    },
    now: number
  ): { success: boolean; message?: SQSMessage; error?: string } {
    // 1. FIFO Deduplication check
    if (queue.type === 'FIFO') {
      let dedupId = messagePayload.messageDeduplicationId;
      if (!dedupId && queue.contentBasedDeduplication) {
        dedupId = computeContentHash(messagePayload.body);
      }

      if (dedupId) {
        const isNew = fifoDedupCache.checkAndRegister(queue.id, dedupId, now);
        if (!isNew) {
          return {
            success: false,
            error: `FIFO Deduplication: message with deduplication ID "${dedupId}" already accepted within 5min window`,
          };
        }
      }
    }

    const delay = messagePayload.delaySeconds !== undefined ? messagePayload.delaySeconds : queue.delaySec;
    const deliverAt = now + delay * 1000;
    const initialState = delay > 0 ? 'delayed' : 'visible';

    const msg: SQSMessage = {
      id: messagePayload.id || `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`,
      traceId: messagePayload.traceId,
      queueId: queue.id,
      body: messagePayload.body,
      messageAttributes: messagePayload.attributes || {},
      messageGroupId: messagePayload.messageGroupId || (queue.type === 'FIFO' ? 'default-group' : undefined),
      messageDeduplicationId: messagePayload.messageDeduplicationId,
      state: initialState,
      sentTimestamp: now,
      deliverAtTimestamp: deliverAt,
      receiveCount: 0,
      visibilityExpiresAt: 0,
      isPoison: !!messagePayload.isPoison,
      history: [
        {
          timestamp: now,
          action: 'ENQUEUED',
          detail: delay > 0 ? `Delayed for ${delay}s` : 'Available immediately',
        },
      ],
    };

    return { success: true, message: msg };
  }

  /**
   * Receives (leases) up to maxMessages from the queue for a worker.
   * Enforces FIFO message group isolation:
   * If a message in group G is already inflight, NO subsequent message in group G can be received.
   */
  public static receiveMessages(
    queue: SQSQueue,
    allMessages: SQSMessage[],
    workerId: string,
    maxMessages: number,
    now: number
  ): SQSMessage[] {
    const queueMessages = allMessages.filter((m) => m.queueId === queue.id);
    const received: SQSMessage[] = [];

    // Find message groups currently locked by in-flight messages in FIFO queues
    const lockedGroups = new Set<string>();
    if (queue.type === 'FIFO') {
      for (const m of queueMessages) {
        if (m.state === 'inflight' && m.messageGroupId) {
          lockedGroups.add(m.messageGroupId);
        }
      }
    }

    for (const msg of queueMessages) {
      if (received.length >= maxMessages) break;

      // Only visible messages can be received
      if (msg.state !== 'visible') continue;

      // Check FIFO group lock
      if (queue.type === 'FIFO' && msg.messageGroupId) {
        if (lockedGroups.has(msg.messageGroupId)) {
          // Blocked by in-flight message in this group
          continue;
        }
      }

      // Lease message
      msg.state = 'inflight';
      msg.receiveCount += 1;
      msg.processingWorkerId = workerId;
      msg.visibilityExpiresAt = now + queue.visibilityTimeoutSec * 1000;
      msg.history.push({
        timestamp: now,
        action: 'LEASED',
        detail: `Leased by worker ${workerId} (Attempt ${msg.receiveCount}/${queue.maxReceiveCount}, expires in ${queue.visibilityTimeoutSec}s)`,
      });

      if (queue.type === 'FIFO' && msg.messageGroupId) {
        lockedGroups.add(msg.messageGroupId);
      }

      received.push(msg);
    }

    return received;
  }

  /**
   * Acknowledges and deletes a message from the queue upon successful processing.
   */
  public static deleteMessage(msg: SQSMessage, now: number): void {
    msg.state = 'deleted';
    msg.history.push({
      timestamp: now,
      action: 'DELETED',
      detail: 'Message acknowledged and removed from queue',
    });
  }

  /**
   * Ticks the queue messages:
   * 1. Delayed messages reaching deliverAt become visible.
   * 2. Inflight messages whose visibility has expired:
   *    - If receiveCount >= maxReceiveCount and DLQ is configured: move to DLQ!
   *    - Otherwise return to visible state for re-delivery.
   */
  public static tickQueueMessages(
    queue: SQSQueue,
    allMessages: SQSMessage[],
    now: number
  ): {
    newlyVisible: SQSMessage[];
    expiredInflight: SQSMessage[];
    movedToDLQ: SQSMessage[];
  } {
    const newlyVisible: SQSMessage[] = [];
    const expiredInflight: SQSMessage[] = [];
    const movedToDLQ: SQSMessage[] = [];

    const queueMessages = allMessages.filter((m) => m.queueId === queue.id);

    for (const msg of queueMessages) {
      // 1. Delayed -> Visible
      if (msg.state === 'delayed' && now >= msg.deliverAtTimestamp) {
        msg.state = 'visible';
        msg.history.push({
          timestamp: now,
          action: 'DELAY_EXPIRED',
          detail: 'Message transitioned to visible state',
        });
        newlyVisible.push(msg);
      }

      // 2. Inflight visibility timeout expiration
      if (msg.state === 'inflight' && now >= msg.visibilityExpiresAt) {
        expiredInflight.push(msg);
        msg.processingWorkerId = undefined;

        // Check MaxReceiveCount -> DLQ transition
        if (msg.receiveCount >= queue.maxReceiveCount && queue.deadLetterQueueId) {
          msg.state = 'dlq';
          msg.queueId = queue.deadLetterQueueId;
          msg.history.push({
            timestamp: now,
            action: 'MOVED_TO_DLQ',
            detail: `Exceeded maxReceiveCount (${msg.receiveCount} >= ${queue.maxReceiveCount}). Routed to DLQ: ${queue.deadLetterQueueId}`,
          });
          movedToDLQ.push(msg);
        } else {
          // Return to visible for retry
          msg.state = 'visible';
          msg.history.push({
            timestamp: now,
            action: 'VISIBILITY_EXPIRED',
            detail: `Visibility timeout expired. Returned to visible state (Receive count: ${msg.receiveCount})`,
          });
          newlyVisible.push(msg);
        }
      }
    }

    return { newlyVisible, expiredInflight, movedToDLQ };
  }
}

