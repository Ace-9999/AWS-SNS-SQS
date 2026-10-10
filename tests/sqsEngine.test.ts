import { describe, it, expect, beforeEach } from 'vitest';
import { SQSEngine, fifoDedupCache } from '../src/engine/sqsEngine';
import { SQSMessage, SQSQueue } from '../src/engine/types';

describe('SQS Engine & State Machine', () => {
  beforeEach(() => {
    fifoDedupCache.clear();
  });

  const standardQueue: SQSQueue = {
    id: 'queue-orders',
    arn: 'arn:aws:sqs:us-east-1:123456789012:orders',
    name: 'OrderProcessingQueue',
    type: 'STANDARD',
    visibilityTimeoutSec: 10,
    delaySec: 0,
    retentionSec: 3600,
    maxReceiveCount: 3,
    deadLetterQueueId: 'queue-orders-dlq',
    createdAt: Date.now(),
  };

  const dlqQueue: SQSQueue = {
    id: 'queue-orders-dlq',
    arn: 'arn:aws:sqs:us-east-1:123456789012:orders-dlq',
    name: 'OrderProcessingDLQ',
    type: 'STANDARD',
    visibilityTimeoutSec: 30,
    delaySec: 0,
    retentionSec: 86400,
    maxReceiveCount: 5,
    createdAt: Date.now(),
  };

  it('enqueues a standard message immediately visible when delaySec is 0', () => {
    const now = 100000;
    const res = SQSEngine.enqueueMessage(
      standardQueue,
      { traceId: 'trace-1', body: { orderId: 101 } },
      now
    );

    expect(res.success).toBe(true);
    expect(res.message).toBeDefined();
    expect(res.message?.state).toBe('visible');
    expect(res.message?.receiveCount).toBe(0);
  });

  it('enqueues a delayed message and transitions it to visible after delay elapsed', () => {
    const queueWithDelay = { ...standardQueue, delaySec: 5 };
    const now = 100000;
    const res = SQSEngine.enqueueMessage(
      queueWithDelay,
      { traceId: 'trace-delay', body: { orderId: 202 } },
      now
    );

    expect(res.message?.state).toBe('delayed');

    const messages = [res.message!];

    // Tick at now + 3s (still delayed)
    const tick1 = SQSEngine.tickQueueMessages(queueWithDelay, messages, now + 3000);
    expect(tick1.newlyVisible.length).toBe(0);
    expect(messages[0].state).toBe('delayed');

    // Tick at now + 5s (becomes visible)
    const tick2 = SQSEngine.tickQueueMessages(queueWithDelay, messages, now + 5000);
    expect(tick2.newlyVisible.length).toBe(1);
    expect(messages[0].state).toBe('visible');
  });

  it('leases message to worker with visibility timeout and increments receiveCount', () => {
    const now = 100000;
    const res = SQSEngine.enqueueMessage(
      standardQueue,
      { traceId: 'trace-2', body: { orderId: 303 } },
      now
    );

    const messages = [res.message!];
    const leased = SQSEngine.receiveMessages(standardQueue, messages, 'worker-1', 1, now);

    expect(leased.length).toBe(1);
    expect(leased[0].state).toBe('inflight');
    expect(leased[0].receiveCount).toBe(1);
    expect(leased[0].processingWorkerId).toBe('worker-1');
    expect(leased[0].visibilityExpiresAt).toBe(now + 10000); // 10s
  });

  it('returns message to visible if visibility expires before deletion and receiveCount < maxReceiveCount', () => {
    const now = 100000;
    const res = SQSEngine.enqueueMessage(
      standardQueue,
      { traceId: 'trace-3', body: { orderId: 404 } },
      now
    );

    const messages = [res.message!];
    SQSEngine.receiveMessages(standardQueue, messages, 'worker-1', 1, now);

    // Advance time past visibility timeout (11s later)
    const tick = SQSEngine.tickQueueMessages(standardQueue, messages, now + 11000);
    expect(tick.expiredInflight.length).toBe(1);
    expect(tick.movedToDLQ.length).toBe(0);
    expect(messages[0].state).toBe('visible');
    expect(messages[0].receiveCount).toBe(1);
    expect(messages[0].processingWorkerId).toBeUndefined();
  });

  it('moves message to DLQ when receiveCount reaches maxReceiveCount', () => {
    const now = 100000;
    const res = SQSEngine.enqueueMessage(
      standardQueue,
      { traceId: 'trace-dlq', body: { poisonId: 999 } },
      now
    );

    const messages = [res.message!];

    // Attempt 1
    SQSEngine.receiveMessages(standardQueue, messages, 'worker-1', 1, now);
    SQSEngine.tickQueueMessages(standardQueue, messages, now + 11000);
    expect(messages[0].state).toBe('visible');
    expect(messages[0].receiveCount).toBe(1);

    // Attempt 2
    SQSEngine.receiveMessages(standardQueue, messages, 'worker-1', 1, now + 12000);
    SQSEngine.tickQueueMessages(standardQueue, messages, now + 23000);
    expect(messages[0].state).toBe('visible');
    expect(messages[0].receiveCount).toBe(2);

    // Attempt 3 (reaches maxReceiveCount: 3)
    SQSEngine.receiveMessages(standardQueue, messages, 'worker-1', 1, now + 24000);
    const tickFinal = SQSEngine.tickQueueMessages(standardQueue, messages, now + 35000);

    expect(tickFinal.movedToDLQ.length).toBe(1);
    expect(messages[0].state).toBe('dlq');
    expect(messages[0].queueId).toBe('queue-orders-dlq');
  });

  it('marks message as deleted upon successful acknowledgment', () => {
    const now = 100000;
    const res = SQSEngine.enqueueMessage(
      standardQueue,
      { traceId: 'trace-del', body: { orderId: 505 } },
      now
    );

    const msg = res.message!;
    SQSEngine.deleteMessage(msg, now + 2000);
    expect(msg.state).toBe('deleted');
    expect(msg.history[msg.history.length - 1].action).toBe('DELETED');
  });

  it('FIFO queue rejects duplicate deduplicationId within deduplication window', () => {
    const fifoQueue: SQSQueue = {
      id: 'orders.fifo',
      arn: 'arn:aws:sqs:us-east-1:123456789012:orders.fifo',
      name: 'orders.fifo',
      type: 'FIFO',
      visibilityTimeoutSec: 10,
      delaySec: 0,
      retentionSec: 3600,
      maxReceiveCount: 3,
      createdAt: Date.now(),
    };

    const now = 100000;
    const res1 = SQSEngine.enqueueMessage(
      fifoQueue,
      { traceId: 't-1', body: { x: 1 }, messageDeduplicationId: 'dedup-abc', messageGroupId: 'group-1' },
      now
    );
    expect(res1.success).toBe(true);

    const res2 = SQSEngine.enqueueMessage(
      fifoQueue,
      { traceId: 't-2', body: { x: 1 }, messageDeduplicationId: 'dedup-abc', messageGroupId: 'group-1' },
      now + 5000
    );
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('FIFO Deduplication');
  });

  it('FIFO queue enforces message group in-flight exclusivity', () => {
    const fifoQueue: SQSQueue = {
      id: 'payments.fifo',
      arn: 'arn:aws:sqs:us-east-1:123456789012:payments.fifo',
      name: 'payments.fifo',
      type: 'FIFO',
      visibilityTimeoutSec: 10,
      delaySec: 0,
      retentionSec: 3600,
      maxReceiveCount: 3,
      createdAt: Date.now(),
    };

    const now = 100000;
    const m1 = SQSEngine.enqueueMessage(
      fifoQueue,
      { traceId: 't-1', body: { seq: 1 }, messageDeduplicationId: 'd1', messageGroupId: 'account-A' },
      now
    ).message!;

    const m2 = SQSEngine.enqueueMessage(
      fifoQueue,
      { traceId: 't-2', body: { seq: 2 }, messageDeduplicationId: 'd2', messageGroupId: 'account-A' },
      now
    ).message!;

    const m3 = SQSEngine.enqueueMessage(
      fifoQueue,
      { traceId: 't-3', body: { seq: 1 }, messageDeduplicationId: 'd3', messageGroupId: 'account-B' },
      now
    ).message!;

    const all = [m1, m2, m3];

    // Worker 1 leases message 1 (account-A)
    const leased1 = SQSEngine.receiveMessages(fifoQueue, all, 'worker-1', 1, now);
    expect(leased1.length).toBe(1);
    expect(leased1[0].id).toBe(m1.id);

    // Worker 2 attempts to lease. m2 is account-A which is locked by m1! So worker 2 should get m3 (account-B)
    const leased2 = SQSEngine.receiveMessages(fifoQueue, all, 'worker-2', 1, now);
    expect(leased2.length).toBe(1);
    expect(leased2[0].id).toBe(m3.id);
  });
});

