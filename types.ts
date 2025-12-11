export interface GeneratedScript {
  headline: string;
  body: string;
}

export enum AppMode {
  GENERATOR = 'GENERATOR',
  LIVE_ROOM = 'LIVE_ROOM',
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}
