// Copyright (C) 2018 The Android Open Source Project
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * A plain js object, holding objects of type |Class| keyed by string id.
 * We use this instead of using |Map| object since it is simpler and faster to
 * serialize for use in postMessage.
 */
export interface ObjectById<Class extends{id: string}> { [id: string]: Class; }

export type Timestamped<T> = {
  [P in keyof T]: T[P];
}&{lastUpdate: number};

export type OmniboxState = Timestamped<{omnibox: string;}>;

export type VisibleState =
    Timestamped<{startSec: number; endSec: number; resolution: number;}>;

export const MAX_TIME = 180;

export const SCROLLING_TRACK_GROUP = 'ScrollingTracks';

export interface TrackState {
  id: string;
  engineId: string;
  kind: string;
  name: string;
  trackGroup?: string;
  config: {};
}

export interface TrackGroupState {
  id: string;
  engineId: string;
  name: string;
  collapsed: boolean;
  tracks: string[];  // Child track ids.
  summaryTrackId: string;
}

export interface EngineConfig {
  id: string;
  ready: boolean;
  source: string|File|ArrayBuffer;
}

export interface QueryConfig {
  id: string;
  engineId: string;
  query: string;
}

export interface PermalinkConfig {
  requestId?: string;  // Set by the frontend to request a new permalink.
  hash?: string;       // Set by the controller when the link has been created.
}

export interface TraceTime {
  startSec: number;
  endSec: number;
}

export interface FrontendLocalState {
  omniboxState: OmniboxState;
  visibleState: VisibleState;
}

export interface Status {
  msg: string;
  timestamp: number;  // Epoch in seconds (Date.now() / 1000).
}

export interface Note {
  id: string;
  timestamp: number;
  color: string;
  text: string;
  isMovie: boolean;
}

export interface NoteSelection {
  kind: 'NOTE';
  id: string;
}

export interface SliceSelection {
  kind: 'SLICE';
  utid: number;
  id: number;
}

export interface ChromeSliceSelection {
  kind: 'CHROME_SLICE';
  id: number;
}

export interface TimeSpanSelection {
  kind: 'TIMESPAN';
  startTs: number;
  endTs: number;
}

export interface ThreadStateSelection {
  kind: 'THREAD_STATE';
  utid: number;
  ts: number;
  dur: number;
  state: string;
}

type Selection = NoteSelection|SliceSelection|ChromeSliceSelection|
    TimeSpanSelection|ThreadStateSelection;

export interface LogsPagination {
  offset: number;
  count: number;
}

export interface State {
  // tslint:disable-next-line:no-any
  [key: string]: any;
  route: string|null;
  nextId: number;

  /**
   * State of the ConfigEditor.
   */
  recordConfig: RecordConfig;
  displayConfigAsPbtxt: boolean;

  /**
   * Open traces.
   */
  engines: ObjectById<EngineConfig>;
  traceTime: TraceTime;
  trackGroups: ObjectById<TrackGroupState>;
  tracks: ObjectById<TrackState>;
  visibleTracks: string[];
  scrollingTracks: string[];
  pinnedTracks: string[];
  queries: ObjectById<QueryConfig>;
  permalink: PermalinkConfig;
  notes: ObjectById<Note>;
  status: Status;
  currentSelection: Selection|null;

  logsPagination: LogsPagination;

  /**
   * This state is updated on the frontend at 60Hz and eventually syncronised to
   * the controller at 10Hz. When the controller sends state updates to the
   * frontend the frontend has special logic to pick whichever version of this
   * key is most up to date.
   */
  frontendLocalState: FrontendLocalState;

  video: string | null;
  videoEnabled: boolean;
  videoOffset: number;
  videoNoteIds: string[];
  scrubbingEnabled: boolean;
  flagPauseEnabled: boolean;
  /**
   * Trace recording
   */
  recordingInProgress: boolean;
  extensionInstalled: boolean;
  serialAndroidDeviceConnected: string|undefined;
  chromeCategories: string[]|undefined;
}

export const defaultTraceTime = {
  startSec: 0,
  endSec: 10,
};

export declare type RecordMode =
    'STOP_WHEN_FULL' | 'RING_BUFFER' | 'LONG_TRACE';

// 'Q','P','O' for Android, 'L' for Linux, 'C' for Chrome.
export declare type TargetOs = 'Q' | 'P' | 'O' | 'C' | 'L';

export function isAndroidTarget(target: TargetOs) {
  return ['Q', 'P', 'O'].includes(target);
}

export function isChromeTarget(target: TargetOs) {
  return target === 'C';
}

export interface RecordConfig {
  [key: string]: null|number|boolean|string|string[];

  // Global settings
  targetOS: TargetOs;
  mode: RecordMode;
  durationMs: number;
  bufferSizeMb: number;
  maxFileSizeMb: number;      // Only for mode == 'LONG_TRACE'.
  fileWritePeriodMs: number;  // Only for mode == 'LONG_TRACE'.

  cpuSched: boolean;
  cpuLatency: boolean;
  cpuFreq: boolean;
  cpuCoarse: boolean;
  cpuCoarsePollMs: number;
  cpuSyscall: boolean;

  screenRecord: boolean;

  gpuFreq: boolean;
  gpuSched: boolean;

  ftrace: boolean;
  atrace: boolean;
  ftraceEvents: string[];
  ftraceExtraEvents: string;
  atraceCats: string[];
  atraceApps: string;
  ftraceBufferSizeKb: number;
  ftraceDrainPeriodMs: number;
  androidLogs: boolean;
  androidLogBuffers: string[];

  batteryDrain: boolean;
  batteryDrainPollMs: number;

  boardSensors: boolean;

  memHiFreq: boolean;
  memLmk: boolean;
  meminfo: boolean;
  meminfoPeriodMs: number;
  meminfoCounters: string[];
  vmstat: boolean;
  vmstatPeriodMs: number;
  vmstatCounters: string[];

  procStats: boolean;
  procStatsPeriodMs: number;
}

export function createEmptyRecordConfig(): RecordConfig {
  return {
    targetOS: 'Q',
    mode: 'STOP_WHEN_FULL',
    durationMs: 10000.0,
    maxFileSizeMb: 100,
    fileWritePeriodMs: 2500,
    bufferSizeMb: 10.0,

    cpuSched: false,
    cpuLatency: false,
    cpuFreq: false,
    cpuSyscall: false,

    screenRecord: false,

    gpuFreq: false,
    gpuSched: false,

    ftrace: false,
    atrace: false,
    ftraceEvents: [],
    ftraceExtraEvents: '',
    atraceCats: [],
    atraceApps: '',
    ftraceBufferSizeKb: 2 * 1024,
    ftraceDrainPeriodMs: 250,
    androidLogs: false,
    androidLogBuffers: [],

    cpuCoarse: false,
    cpuCoarsePollMs: 1000,

    batteryDrain: false,
    batteryDrainPollMs: 1000,

    boardSensors: false,

    memHiFreq: false,
    meminfo: false,
    meminfoPeriodMs: 1000,
    meminfoCounters: [],

    vmstat: false,
    vmstatPeriodMs: 1000,
    vmstatCounters: [],

    memLmk: false,
    procStats: false,
    procStatsPeriodMs: 1000,
  };
}

export function createEmptyState(): State {
  return {
    route: null,
    nextId: 0,
    engines: {},
    traceTime: {...defaultTraceTime},
    tracks: {},
    trackGroups: {},
    visibleTracks: [],
    pinnedTracks: [],
    scrollingTracks: [],
    queries: {},
    permalink: {},
    notes: {},

    recordConfig: createEmptyRecordConfig(),
    displayConfigAsPbtxt: false,

    frontendLocalState: {
      omniboxState: {
        lastUpdate: 0,
        omnibox: '',
      },

      visibleState: {
        ...defaultTraceTime,
        lastUpdate: 0,
        resolution: 0,
      },
    },

    logsPagination: {
      offset: 0,
      count: 0,
    },

    status: {msg: '', timestamp: 0},
    currentSelection: null,

    video: null,
    videoEnabled: false,
    videoOffset: 0,
    videoNoteIds: [],
    scrubbingEnabled: false,
    flagPauseEnabled: false,
    recordingInProgress: false,
    extensionInstalled: false,
    serialAndroidDeviceConnected: undefined,
    chromeCategories: undefined,
  };
}
