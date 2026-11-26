import crypto from 'crypto';
import { logger } from '../../infrastructure/logging/logger.js';

export interface StageTimingRecord {
  stage: string;
  durationMs: number;
  outcome: 'success' | 'failed' | 'skipped';
  details?: Record<string, any>;
}

export class PipelineTracker {
  public readonly requestId: string;
  public readonly documentId: string;
  private startTimes: Map<string, number> = new Map();
  private records: StageTimingRecord[] = [];
  private pipelineStart: number;

  constructor(documentId: string, customRequestId?: string) {
    this.documentId = documentId;
    this.requestId = customRequestId || crypto.randomUUID();
    this.pipelineStart = performance.now();
  }

  public startStage(stage: string): void {
    this.startTimes.set(stage, performance.now());
    logger.info(
      {
        requestId: this.requestId,
        documentId: this.documentId,
        stage,
      },
      `[PipelineTracker] Started stage "${stage}"`
    );
  }

  public endStage(
    stage: string,
    outcome: 'success' | 'failed' | 'skipped' = 'success',
    details?: Record<string, any>
  ): number {
    const startTime = this.startTimes.get(stage) || performance.now();
    const durationMs = Math.round(performance.now() - startTime);

    const record: StageTimingRecord = {
      stage,
      durationMs,
      outcome,
      details,
    };
    this.records.push(record);

    logger.info(
      {
        requestId: this.requestId,
        documentId: this.documentId,
        stage,
        durationMs,
        outcome,
        ...(details || {}),
      },
      `[PipelineTracker] Completed stage "${stage}" in ${durationMs}ms (${outcome})`
    );

    return durationMs;
  }

  public getSummary(): {
    requestId: string;
    documentId: string;
    totalDurationMs: number;
    stages: StageTimingRecord[];
  } {
    const totalDurationMs = Math.round(performance.now() - this.pipelineStart);
    return {
      requestId: this.requestId,
      documentId: this.documentId,
      totalDurationMs,
      stages: this.records,
    };
  }

  public logComplete(status: 'Ready' | 'Failed'): void {
    const summary = this.getSummary();
    logger.info(
      {
        requestId: summary.requestId,
        documentId: summary.documentId,
        status,
        totalDurationMs: summary.totalDurationMs,
        stages: summary.stages,
      },
      `[PipelineTracker] End-to-end document processing ${status} in ${summary.totalDurationMs}ms`
    );
  }
}
