import { SimulationEvent, EventPattern } from './types';
import { matchEventPattern } from './eventPatternMatcher';

export interface ArchiveFilterOptions {
  startTime?: number;
  endTime?: number;
  source?: string;
  detailType?: string;
  pattern?: EventPattern;
}

/**
 * EventBridge Archive Store
 * Keeps persistent history of events and supports replay capabilities.
 */
export class ArchiveStore {
  private events: SimulationEvent[] = [];
  private maxCapacity: number = 2000;

  constructor(initialEvents: SimulationEvent[] = [], maxCapacity = 2000) {
    this.events = [...initialEvents];
    this.maxCapacity = maxCapacity;
  }

  public addEvent(event: SimulationEvent) {
    this.events.unshift(event);
    if (this.events.length > this.maxCapacity) {
      this.events.pop();
    }
  }

  public getAll(): SimulationEvent[] {
    return [...this.events];
  }

  public getById(id: string): SimulationEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  /**
   * Queries events matching time window and optional rule pattern
   */
  public query(options: ArchiveFilterOptions = {}): SimulationEvent[] {
    return this.events.filter((event) => {
      const eventTime = new Date(event.time).getTime();

      if (options.startTime !== undefined && eventTime < options.startTime) {
        return false;
      }

      if (options.endTime !== undefined && eventTime > options.endTime) {
        return false;
      }

      if (options.source && !event.source.toLowerCase().includes(options.source.toLowerCase())) {
        return false;
      }

      if (options.detailType && !event.detailType.toLowerCase().includes(options.detailType.toLowerCase())) {
        return false;
      }

      if (options.pattern) {
        const matchResult = matchEventPattern(options.pattern, event);
        if (!matchResult.matches) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Prepares replay events from an archive query
   * Tags them visibly with `isReplay: true` and a new traceId
   */
  public prepareReplay(
    options: ArchiveFilterOptions = {},
    simNow: number
  ): SimulationEvent[] {
    const matched = this.query(options);

    return matched.map((orig) => {
      const replayId = `replay-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const replayTraceId = `trace-replay-${Math.random().toString(36).substring(2, 8)}`;

      return {
        ...orig,
        id: replayId,
        traceId: replayTraceId,
        time: new Date(simNow).toISOString(),
        isReplay: true,
        replayOriginalId: orig.id,
      };
    });
  }

  public clear() {
    this.events = [];
  }

  public size(): number {
    return this.events.length;
  }
}

