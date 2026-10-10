import { describe, it, expect } from 'vitest';
import { evaluateSNSSubscriptionFilter, fanoutSNSMessage } from '../src/engine/snsFilterEngine';
import { SNSSubscription, SNSTopic } from '../src/engine/types';

describe('SNS Filter & Fan-out Engine', () => {
  const sampleTopic: SNSTopic = {
    id: 'topic-orders',
    arn: 'arn:aws:sns:us-east-1:123456789012:orders',
    name: 'OrderEvents',
    subscriptions: [],
    createdAt: Date.now(),
  };

  it('allows message through when subscription has no filter policy', () => {
    const sub: SNSSubscription = {
      id: 'sub-all',
      topicId: 'topic-orders',
      protocol: 'sqs',
      endpoint: 'queue-all',
    };

    const res = evaluateSNSSubscriptionFilter(sub, { status: 'ANY' }, {});
    expect(res.matched).toBe(true);
  });

  it('matches message attributes filter policy', () => {
    const sub: SNSSubscription = {
      id: 'sub-vip',
      topicId: 'topic-orders',
      protocol: 'sqs',
      endpoint: 'queue-vip',
      filterPolicyScope: 'MessageAttributes',
      filterPolicy: {
        CustomerType: ['VIP', 'PLATINUM'],
        OrderTotal: [{ numeric: ['>=', 100] }],
      },
    };

    const attrs = {
      CustomerType: { DataType: 'String', StringValue: 'VIP' },
      OrderTotal: { DataType: 'Number', NumberValue: 250 },
    };

    const res = evaluateSNSSubscriptionFilter(sub, {}, attrs);
    expect(res.matched).toBe(true);

    const nonMatchingAttrs = {
      CustomerType: { DataType: 'String', StringValue: 'STANDARD' },
      OrderTotal: { DataType: 'Number', NumberValue: 250 },
    };
    const failRes = evaluateSNSSubscriptionFilter(sub, {}, nonMatchingAttrs);
    expect(failRes.matched).toBe(false);
    expect(failRes.reason).toContain('CustomerType');
  });

  it('fans out to matching subscriptions and ignores non-matching ones', () => {
    const subStandard: SNSSubscription = {
      id: 'sub-std',
      topicId: 'topic-orders',
      protocol: 'sqs',
      endpoint: 'queue-std',
      filterPolicyScope: 'MessageAttributes',
      filterPolicy: {
        tier: ['standard'],
      },
    };

    const subVip: SNSSubscription = {
      id: 'sub-vip',
      topicId: 'topic-orders',
      protocol: 'sqs',
      endpoint: 'queue-vip',
      filterPolicyScope: 'MessageAttributes',
      filterPolicy: {
        tier: ['vip'],
      },
    };

    const subAudit: SNSSubscription = {
      id: 'sub-audit',
      topicId: 'topic-orders',
      protocol: 'http',
      endpoint: 'https://audit.mock.internal/events',
      // No filter policy -> matches all
    };

    const topic: SNSTopic = {
      ...sampleTopic,
      subscriptions: [subStandard, subVip, subAudit],
    };

    const fanout = fanoutSNSMessage(topic, {}, {
      tier: { DataType: 'String', StringValue: 'vip' },
    });

    expect(fanout.totalSubscriptions).toBe(3);
    expect(fanout.matchedSubscriptions.length).toBe(2);
    expect(fanout.matchedSubscriptions.map((s) => s.id)).toEqual(['sub-vip', 'sub-audit']);
  });
});

