import { AWSServiceType, SimulationEvent, TraceHop, TraceRecord } from './types';

/**
 * Trace Recorder
 * Captures the hop-by-hop journey of every event across the simulated AWS pipeline.
 */
export class TraceRecorder {
  private traces: Map<string, TraceRecord> = new Map();
  private maxCapacity: number = 1000;

  constructor(initialTraces: TraceRecord[] = [], maxCapacity = 1000) {
    this.maxCapacity = maxCapacity;
    for (const t of initialTraces) {
      this.traces.set(t.traceId, t);
    }
  }

  /**
   * Initializes a new trace when an event enters EventBridge
   */
  public startTrace(event: SimulationEvent, now: number): TraceRecord {
    const record: TraceRecord = {
      traceId: event.traceId,
      originalEvent: event,
      startTime: now,
      hops: [
        {
          id: `hop-${Date.now().toString(36)}-1`,
          hopIndex: 1,
          timestamp: now,
          service: 'EventBridge',
          nodeId: 'eventbus-default',
          nodeName: 'Default Event Bus',
          action: event.isReplay ? 'EVENT_REPLAYED' : 'EVENT_PUBLISHED',
          status: 'SUCCESS',
          details: `Ingested ${event.detailType} from ${event.source}${event.isReplay ? ' [REPLAYED]' : ''}`,
          payloadSnapshot: event,
        },
      ],
      status: 'PROCESSING',
    };

    this.traces.set(event.traceId, record);

    // Evict oldest if capacity exceeded
    if (this.traces.size > this.maxCapacity) {
      const oldestKey = this.traces.keys().next().value;
      if (oldestKey) this.traces.delete(oldestKey);
    }

    return record;
  }

  /**
   * Appends a new hop to an existing trace
   */
  public recordHop(
    traceId: string,
    hopData: {
      service: AWSServiceType;
      nodeId: string;
      nodeName: string;
      action: string;
      status: 'SUCCESS' | 'DROPPED' | 'FAILED' | 'RETRY' | 'DLQ' | 'PENDING';
      details: string;
      diffReason?: string;
      payloadSnapshot?: any;
    },
    now: number
  ): TraceHop | null {
    const trace = this.traces.get(traceId);
    if (!trace) return null;

    const hopIndex = trace.hops.length + 1;
    const newHop: TraceHop = {
      id: `hop-${Date.now().toString(36)}-${hopIndex}`,
      hopIndex,
      timestamp: now,
      service: hopData.service,
      nodeId: hopData.nodeId,
      nodeName: hopData.nodeName,
      action: hopData.action,
      status: hopData.status,
      details: hopData.details,
      diffReason: hopData.diffReason,
      payloadSnapshot: hopData.payloadSnapshot,
    };

    trace.hops.push(newHop);

    // Update overall trace status
    if (hopData.status === 'DLQ') {
      trace.status = 'DLQ';
      trace.endTime = now;
    } else if (hopData.status === 'DROPPED' && trace.hops.length > 2) {
      // If dropped at rule or SNS filter
      trace.status = 'DROPPED';
      trace.endTime = now;
    } else if (hopData.action === 'ACK_DELETED') {
      trace.status = 'DELIVERED';
      trace.endTime = now;
    }

    return newHop;
  }

  public getTrace(traceId: string): TraceRecord | undefined {
    return this.traces.get(traceId);
  }

  public getAllTraces(): TraceRecord[] {
    return Array.from(this.traces.values()).reverse();
  }

  public searchTraces(query: string, statusFilter?: string): TraceRecord[] {
    const q = query.toLowerCase().trim();
    return this.getAllTraces().filter((t) => {
      if (statusFilter && statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        t.traceId.toLowerCase().includes(q) ||
        t.originalEvent.source.toLowerCase().includes(q) ||
        t.originalEvent.detailType.toLowerCase().includes(q) ||
        JSON.stringify(t.originalEvent.detail).toLowerCase().includes(q)
      );
    });
  }

  public clear() {
    this.traces.clear();
  }
}

