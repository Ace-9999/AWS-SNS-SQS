import { SimClockState } from './types';

export type SimTickCallback = (deltaMs: number, simNow: number) => void;

/**
 * PulseBridge Discrete Simulation Clock
 * Manages simulation speed, play/pause state, and tick scheduling.
 */
export class SimulationClock {
  private isRunning: boolean = true;
  private speed: 0.5 | 1 | 2 | 5 | 10 = 1;
  private tickCount: number = 0;
  private simTimeMs: number = Date.now();
  private baseIntervalMs: number = 250; // 4 ticks per second at 1x
  private timerId: any = null;
  private listeners: Set<SimTickCallback> = new Set();

  constructor(initialRunning = true, initialSpeed: 0.5 | 1 | 2 | 5 | 10 = 1) {
    this.isRunning = initialRunning;
    this.speed = initialSpeed;
    if (this.isRunning) {
      this.startTimer();
    }
  }

  public subscribe(cb: SimTickCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getState(): SimClockState {
    return {
      isRunning: this.isRunning,
      speed: this.speed,
      tickCount: this.tickCount,
      simTimeMs: this.simTimeMs,
    };
  }

  public play() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.startTimer();
    }
  }

  public pause() {
    if (this.isRunning) {
      this.isRunning = false;
      this.stopTimer();
    }
  }

  public togglePlay() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setSpeed(speed: 0.5 | 1 | 2 | 5 | 10) {
    this.speed = speed;
    if (this.isRunning) {
      this.stopTimer();
      this.startTimer();
    }
  }

  /**
   * Manually executes a single simulation tick step
   */
  public step() {
    this.tick(this.baseIntervalMs);
  }

  private startTimer() {
    this.stopTimer();
    const interval = Math.max(25, Math.floor(this.baseIntervalMs / this.speed));
    this.timerId = setInterval(() => {
      this.tick(this.baseIntervalMs * this.speed);
    }, interval);
  }

  private stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private tick(deltaVirtualMs: number) {
    this.tickCount++;
    this.simTimeMs += deltaVirtualMs;

    for (const listener of this.listeners) {
      try {
        listener(deltaVirtualMs, this.simTimeMs);
      } catch (err) {
        console.error('Error in sim tick listener:', err);
      }
    }
  }

  public reset(newSimTime = Date.now()) {
    this.tickCount = 0;
    this.simTimeMs = newSimTime;
  }
}

