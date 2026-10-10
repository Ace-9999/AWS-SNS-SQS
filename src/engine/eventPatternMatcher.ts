import { EventPattern, MatchResult, PatternLeafMatcher, SimulationEvent } from './types';

/**
 * Evaluates whether an event value matches a single PatternLeafMatcher item.
 */
function evaluateLeafMatcher(
  matcher: PatternLeafMatcher,
  actualValue: any
): { matches: boolean; reason?: string } {
  // 1. Primitive exact match (string, number, boolean, null)
  if (
    typeof matcher === 'string' ||
    typeof matcher === 'number' ||
    typeof matcher === 'boolean' ||
    matcher === null
  ) {
    if (actualValue === matcher) {
      return { matches: true };
    }
    return {
      matches: false,
      reason: `expected exact ${JSON.stringify(matcher)}, got ${JSON.stringify(actualValue)}`,
    };
  }

  if (typeof matcher !== 'object' || matcher === null) {
    return { matches: false, reason: `invalid matcher: ${JSON.stringify(matcher)}` };
  }

  // 2. Exists matching: {"exists": true} or {"exists": false}
  if ('exists' in matcher) {
    const isPresent = actualValue !== undefined;
    if (matcher.exists === isPresent) {
      return { matches: true };
    }
    return {
      matches: false,
      reason: matcher.exists
        ? `expected field to exist, but field was missing`
        : `expected field NOT to exist, but field was present`,
    };
  }

  // If actualValue is missing (undefined) for any remaining matcher, it fails
  if (actualValue === undefined) {
    return { matches: false, reason: `field was missing` };
  }

  // 3. Prefix matching: {"prefix": "foo"}
  if ('prefix' in matcher && typeof matcher.prefix === 'string') {
    if (typeof actualValue === 'string' && actualValue.startsWith(matcher.prefix)) {
      return { matches: true };
    }
    return {
      matches: false,
      reason: `expected prefix "${matcher.prefix}", got "${String(actualValue)}"`,
    };
  }

  // 4. Suffix matching: {"suffix": "bar"}
  if ('suffix' in matcher && typeof matcher.suffix === 'string') {
    if (typeof actualValue === 'string' && actualValue.endsWith(matcher.suffix)) {
      return { matches: true };
    }
    return {
      matches: false,
      reason: `expected suffix "${matcher.suffix}", got "${String(actualValue)}"`,
    };
  }

  // 5. Anything-but matching:
  // {"anything-but": "bad"} or {"anything-but": ["a", "b"]} or {"anything-but": {"prefix": "test-"}}
  if ('anything-but' in matcher) {
    const ab = matcher['anything-but'];
    if (typeof ab === 'string' || typeof ab === 'number' || typeof ab === 'boolean') {
      if (actualValue !== ab) {
        return { matches: true };
      }
      return {
        matches: false,
        reason: `expected anything-but ${JSON.stringify(ab)}, got ${JSON.stringify(actualValue)}`,
      };
    }

    if (Array.isArray(ab)) {
      if (!ab.includes(actualValue)) {
        return { matches: true };
      }
      return {
        matches: false,
        reason: `expected anything-but [${ab.map((x) => JSON.stringify(x)).join(', ')}], got ${JSON.stringify(actualValue)}`,
      };
    }

    if (typeof ab === 'object' && ab !== null) {
      if ('prefix' in ab && typeof (ab as any).prefix === 'string') {
        const p = (ab as any).prefix;
        if (typeof actualValue !== 'string' || !actualValue.startsWith(p)) {
          return { matches: true };
        }
        return {
          matches: false,
          reason: `expected anything-but prefix "${p}", but "${String(actualValue)}" matched prefix`,
        };
      }
      if ('suffix' in ab && typeof (ab as any).suffix === 'string') {
        const s = (ab as any).suffix;
        if (typeof actualValue !== 'string' || !actualValue.endsWith(s)) {
          return { matches: true };
        }
        return {
          matches: false,
          reason: `expected anything-but suffix "${s}", but "${String(actualValue)}" matched suffix`,
        };
      }
    }
  }

  // 6. Numeric range matching: {"numeric": [">=", 100, "<=", 500]}
  if ('numeric' in matcher && Array.isArray(matcher.numeric)) {
    if (typeof actualValue !== 'number' || isNaN(actualValue)) {
      return {
        matches: false,
        reason: `expected numeric comparison, but value was ${typeof actualValue} (${JSON.stringify(actualValue)})`,
      };
    }

    const ops = matcher.numeric;
    // Iterate in pairs: [op, val, op2, val2...]
    for (let i = 0; i < ops.length; i += 2) {
      const op = ops[i];
      const targetVal = ops[i + 1];
      if (typeof targetVal !== 'number') continue;

      let satisfied = false;
      switch (op) {
        case '<':
          satisfied = actualValue < targetVal;
          break;
        case '<=':
          satisfied = actualValue <= targetVal;
          break;
        case '=':
          satisfied = actualValue === targetVal;
          break;
        case '>':
          satisfied = actualValue > targetVal;
          break;
        case '>=':
          satisfied = actualValue >= targetVal;
          break;
        default:
          return { matches: false, reason: `unsupported numeric operator "${op}"` };
      }

      if (!satisfied) {
        return {
          matches: false,
          reason: `expected numeric ${op} ${targetVal}, got ${actualValue}`,
        };
      }
    }
    return { matches: true };
  }

  return { matches: false, reason: `unsupported matcher: ${JSON.stringify(matcher)}` };
}

/**
 * Matches an array of pattern matchers against actual value(s).
 * In EventBridge:
 * Pattern: `[matcher1, matcher2]` is an OR combination (any one matcher satisfies the pattern).
 * If actualValue is an array, ANY element in actualValue satisfying ANY element in pattern matches!
 */
function matchPatternListAgainstValue(
  patternList: PatternLeafMatcher[],
  actualValue: any,
  fieldPath: string
): { matches: boolean; failReason?: string } {
  // If actual value is an array of items (e.g. tags: ["prod", "us-east-1"])
  const valuesToTest = Array.isArray(actualValue) ? actualValue : [actualValue];

  const individualFailures: string[] = [];

  for (const matcher of patternList) {
    for (const val of valuesToTest) {
      const result = evaluateLeafMatcher(matcher, val);
      if (result.matches) {
        return { matches: true };
      } else if (result.reason) {
        individualFailures.push(result.reason);
      }
    }
  }

  // If no match found, pick the most informative reason
  const detail = individualFailures.length > 0 ? individualFailures[0] : 'no matching criteria satisfied';
  return {
    matches: false,
    failReason: `${fieldPath}: ${detail}`,
  };
}

/**
 * Recursively matches a pattern object against an event object.
 */
function matchPatternObject(
  patternObj: Record<string, any>,
  eventObj: Record<string, any>,
  parentPath = ''
): { matches: boolean; reasons: string[] } {
  const reasons: string[] = [];

  for (const [key, patternVal] of Object.entries(patternObj)) {
    const currentPath = parentPath ? `${parentPath}.${key}` : key;
    const actualVal = eventObj ? eventObj[key] : undefined;

    if (Array.isArray(patternVal)) {
      // Leaf list of matchers
      const matchCheck = matchPatternListAgainstValue(patternVal, actualVal, currentPath);
      if (!matchCheck.matches) {
        reasons.push(matchCheck.failReason || `${currentPath}: pattern mismatch`);
      }
    } else if (typeof patternVal === 'object' && patternVal !== null) {
      // Sub-object (e.g. detail: { order: { ... } })
      if (actualVal === undefined || typeof actualVal !== 'object' || actualVal === null) {
        reasons.push(`${currentPath}: expected object structure, but field was missing or non-object`);
      } else {
        const subResult = matchPatternObject(patternVal, actualVal, currentPath);
        if (!subResult.matches) {
          reasons.push(...subResult.reasons);
        }
      }
    }
  }

  return {
    matches: reasons.length === 0,
    reasons,
  };
}

/**
 * Main EventBridge Pattern Matcher
 * Maps event structure (source, detail-type, detail, etc.) to pattern.
 */
export function matchEventPattern(
  pattern: EventPattern,
  event: SimulationEvent
): MatchResult {
  // EventBridge matches standard fields: source, detail-type, detail, id, region, account, etc.
  const eventPayload: Record<string, any> = {
    source: event.source,
    'detail-type': event.detailType,
    detail: event.detail,
    id: event.id,
    region: event.region,
    account: event.account,
    resources: event.resources,
  };

  const evalResult = matchPatternObject(pattern, eventPayload);

  return {
    matches: evalResult.matches,
    reasons: evalResult.reasons,
  };
}

