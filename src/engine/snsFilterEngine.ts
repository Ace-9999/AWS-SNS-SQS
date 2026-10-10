import { SNSSubscription, SNSTopic } from './types';

export interface SNSFilterEvaluationResult {
  subscriptionId: string;
  endpoint: string;
  protocol: string;
  matched: boolean;
  reason?: string;
}

export interface SNSFanoutResult {
  topicId: string;
  topicName: string;
  totalSubscriptions: number;
  matchedSubscriptions: SNSSubscription[];
  evaluations: SNSFilterEvaluationResult[];
}

/**
 * Checks a single SNS attribute matcher against an attribute value or body value
 */
function evaluateSNSMatcherItem(matcher: any, actualValue: any): boolean {
  if (typeof matcher === 'string' || typeof matcher === 'number' || typeof matcher === 'boolean') {
    return actualValue === matcher;
  }

  if (typeof matcher === 'object' && matcher !== null) {
    if ('exists' in matcher) {
      const isPresent = actualValue !== undefined && actualValue !== null;
      return matcher.exists === isPresent;
    }

    if (actualValue === undefined || actualValue === null) {
      return false;
    }

    if ('prefix' in matcher && typeof matcher.prefix === 'string') {
      return typeof actualValue === 'string' && actualValue.startsWith(matcher.prefix);
    }

    if ('anything-but' in matcher) {
      const ab = matcher['anything-but'];
      if (Array.isArray(ab)) {
        return !ab.includes(actualValue);
      }
      if (typeof ab === 'object' && ab !== null && 'prefix' in ab) {
        return typeof actualValue !== 'string' || !actualValue.startsWith(ab.prefix);
      }
      return actualValue !== ab;
    }

    if ('numeric' in matcher && Array.isArray(matcher.numeric)) {
      if (typeof actualValue !== 'number' || isNaN(actualValue)) return false;
      const ops = matcher.numeric;
      for (let i = 0; i < ops.length; i += 2) {
        const op = ops[i];
        const val = ops[i + 1];
        if (typeof val !== 'number') continue;
        if (op === '<' && !(actualValue < val)) return false;
        if (op === '<=' && !(actualValue <= val)) return false;
        if (op === '=' && !(actualValue === val)) return false;
        if (op === '>' && !(actualValue > val)) return false;
        if (op === '>=' && !(actualValue >= val)) return false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Evaluates whether a given subscription's FilterPolicy matches the message
 */
export function evaluateSNSSubscriptionFilter(
  sub: SNSSubscription,
  messageBody: any,
  messageAttributes: Record<string, { DataType: string; StringValue?: string; NumberValue?: number }> = {}
): { matched: boolean; reason?: string } {
  // If no filter policy, the subscription receives all messages
  if (!sub.filterPolicy || Object.keys(sub.filterPolicy).length === 0) {
    return { matched: true };
  }

  const isBodyScope = sub.filterPolicyScope === 'MessageBody';

  for (const [key, matchCriteria] of Object.entries(sub.filterPolicy)) {
    let actualValue: any = undefined;

    if (isBodyScope) {
      // Traverse nested path if needed, e.g. "payment.type"
      const parts = key.split('.');
      let curr = messageBody;
      for (const part of parts) {
        if (curr && typeof curr === 'object') {
          curr = curr[part];
        } else {
          curr = undefined;
          break;
        }
      }
      actualValue = curr;
    } else {
      // Attribute scope: extract from messageAttributes
      const attr = messageAttributes[key];
      if (attr) {
        actualValue = attr.DataType === 'Number' ? attr.NumberValue : attr.StringValue;
      }
    }

    // Match criteria in SNS must be an array of matching conditions (OR logic for list)
    if (!Array.isArray(matchCriteria)) {
      return {
        matched: false,
        reason: `Filter policy syntax error for attribute "${key}": criteria must be an array`,
      };
    }

    const valueMatchesAny = matchCriteria.some((item) => evaluateSNSMatcherItem(item, actualValue));

    if (!valueMatchesAny) {
      return {
        matched: false,
        reason: `Attribute "${key}": actual value ${JSON.stringify(actualValue)} did not match filter policy ${JSON.stringify(matchCriteria)}`,
      };
    }
  }

  return { matched: true };
}

/**
 * Simulates SNS topic fan-out across all subscriptions
 */
export function fanoutSNSMessage(
  topic: SNSTopic,
  messageBody: any,
  messageAttributes: Record<string, { DataType: string; StringValue?: string; NumberValue?: number }> = {}
): SNSFanoutResult {
  const evaluations: SNSFilterEvaluationResult[] = [];
  const matchedSubscriptions: SNSSubscription[] = [];

  for (const sub of topic.subscriptions) {
    const evalRes = evaluateSNSSubscriptionFilter(sub, messageBody, messageAttributes);
    evaluations.push({
      subscriptionId: sub.id,
      endpoint: sub.endpoint,
      protocol: sub.protocol,
      matched: evalRes.matched,
      reason: evalRes.reason,
    });

    if (evalRes.matched) {
      matchedSubscriptions.push(sub);
    }
  }

  return {
    topicId: topic.id,
    topicName: topic.name,
    totalSubscriptions: topic.subscriptions.length,
    matchedSubscriptions,
    evaluations,
  };
}

