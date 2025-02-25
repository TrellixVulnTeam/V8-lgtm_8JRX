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

import '../tracks/all_frontend';

import {applyPatches, Patch} from 'immer';
import * as MicroModal from 'micromodal';
import * as m from 'mithril';

import {assertExists} from '../base/logging';
import {forwardRemoteCalls} from '../base/remote';
import {Actions} from '../common/actions';
import {
  LogBoundsKey,
  LogEntriesKey,
  LogExists,
  LogExistsKey
} from '../common/logs';

import {globals, QuantizedLoad, SliceDetails, ThreadDesc} from './globals';
import {HomePage} from './home_page';
import {openBufferWithLegacyTraceViewer} from './legacy_trace_viewer';
import {postMessageHandler} from './post_message_handler';
import {RecordPage} from './record_page';
import {Router} from './router';
import {ViewerPage} from './viewer_page';

const EXTENSION_ID = 'lfmkphfpdbjijhpomgecfikhfohaoine';

/**
 * The API the main thread exposes to the controller.
 */
class FrontendApi {
  constructor(private router: Router) {}

  patchState(patches: Patch[]) {
    const oldState = globals.state;
    globals.state = applyPatches(globals.state, patches);

    // If the visible time in the global state has been updated more recently
    // than the visible time handled by the frontend @ 60fps, update it. This
    // typically happens when restoring the state from a permalink.
    globals.frontendLocalState.mergeState(globals.state.frontendLocalState);

    // Only redraw if something other than the frontendLocalState changed.
    for (const key in globals.state) {
      if (key !== 'frontendLocalState' && key !== 'visibleTracks' &&
          oldState[key] !== globals.state[key]) {
        this.redraw();
        return;
      }
    }
  }

  // TODO: we can't have a publish method for each batch of data that we don't
  // want to keep in the global state. Figure out a more generic and type-safe
  // mechanism to achieve this.

  publishOverviewData(data: {[key: string]: QuantizedLoad | QuantizedLoad[]}) {
    for (const [key, value] of Object.entries(data)) {
      if (!globals.overviewStore.has(key)) {
        globals.overviewStore.set(key, []);
      }
      if (value instanceof Array) {
        globals.overviewStore.get(key)!.push(...value);
      } else {
        globals.overviewStore.get(key)!.push(value);
      }
    }
    globals.rafScheduler.scheduleRedraw();
  }

  publishTrackData(args: {id: string, data: {}}) {
    globals.setTrackData(args.id, args.data);
    if ([LogExistsKey, LogBoundsKey, LogEntriesKey].includes(args.id)) {
      const data = globals.trackDataStore.get(LogExistsKey) as LogExists;
      if (data && data.exists) globals.rafScheduler.scheduleFullRedraw();
    } else {
      globals.rafScheduler.scheduleRedraw();
    }
  }

  publishQueryResult(args: {id: string, data: {}}) {
    globals.queryResults.set(args.id, args.data);
    this.redraw();
  }

  publishThreads(data: ThreadDesc[]) {
    globals.threads.clear();
    data.forEach(thread => {
      globals.threads.set(thread.utid, thread);
    });
    this.redraw();
  }

  publishSliceDetails(click: SliceDetails) {
    globals.sliceDetails = click;
    this.redraw();
  }

  publishLoading(loading: boolean) {
    globals.loading = loading;
    globals.rafScheduler.scheduleRedraw();
  }

  // For opening JSON/HTML traces with the legacy catapult viewer.
  publishLegacyTrace(args: {data: ArrayBuffer, size: number}) {
    const arr = new Uint8Array(args.data, 0, args.size);
    const str = (new TextDecoder('utf-8')).decode(arr);
    openBufferWithLegacyTraceViewer('trace.json', str, 0);
  }

  publishBufferUsage(args: {percentage: number}) {
    globals.setBufferUsage(args.percentage);
    this.redraw();
  }

  publishSearch(args: {}) {
    console.log('publish search results', args);
  }

  publishRecordingLog(args: {logs: string}) {
    globals.setRecordingLog(args.logs);
    this.redraw();
  }

  private redraw(): void {
    if (globals.state.route &&
        globals.state.route !== this.router.getRouteFromHash()) {
      this.router.setRouteOnHash(globals.state.route);
    }

    globals.rafScheduler.scheduleFullRedraw();
  }
}

function setExtensionAvailability(available: boolean) {
  globals.dispatch(Actions.setExtensionAvailable({
    available,
  }));
}

function fetchChromeTracingCategoriesFromExtension(
    extensionPort: chrome.runtime.Port) {
  extensionPort.postMessage({method: 'GetCategories'});
}

function onExtensionMessage(message: object) {
  const typedObject = message as {type: string};
  if (typedObject.type === 'GetCategoriesResponse') {
    const categoriesMessage = message as {categories: string[]};
    globals.dispatch(Actions.setChromeCategories(
        {categories: categoriesMessage.categories}));
  }
}

function main() {
  const controller = new Worker('controller_bundle.js');
  controller.onerror = e => {
    console.error(e);
  };
  const frontendChannel = new MessageChannel();
  const controllerChannel = new MessageChannel();
  const extensionLocalChannel = new MessageChannel();


  controller.postMessage(
      {
        frontendPort: frontendChannel.port1,
        controllerPort: controllerChannel.port1,
        extensionPort: extensionLocalChannel.port1
      },
      [
        frontendChannel.port1,
        controllerChannel.port1,
        extensionLocalChannel.port1
      ]);

  const dispatch =
      controllerChannel.port2.postMessage.bind(controllerChannel.port2);
  const router = new Router(
      '/',
      {
        '/': HomePage,
        '/viewer': ViewerPage,
        '/record': RecordPage,
      },
      dispatch);
  forwardRemoteCalls(frontendChannel.port2, new FrontendApi(router));
  globals.initialize(dispatch, controller);

  // We proxy messages between the extension and the controller because the
  // controller's worker can't access chrome.runtime.
  const extensionPort =
      chrome.runtime ? chrome.runtime.connect(EXTENSION_ID) : undefined;

  setExtensionAvailability(extensionPort !== undefined);

  if (extensionPort) {
    extensionPort.onDisconnect.addListener(_ => {
      setExtensionAvailability(false);
      // tslint:disable-next-line: no-unused-expression
      void chrome.runtime.lastError;  // Needed to not receive an error log.
    });
    // This forwards the messages from the extension to the controller.
    extensionPort.onMessage.addListener(
        (message: object, _port: chrome.runtime.Port) => {
          onExtensionMessage(message);
          extensionLocalChannel.port2.postMessage(message);
        });
    fetchChromeTracingCategoriesFromExtension(extensionPort);
  }

  // This forwards the messages from the controller to the extension
  extensionLocalChannel.port2.onmessage = ({data}) => {
    if (extensionPort) extensionPort.postMessage(data);
  };
  const main = assertExists(document.body.querySelector('main'));

  globals.rafScheduler.domRedraw = () =>
      m.render(main, m(router.resolve(globals.state.route)));

  // Add support for opening traces from postMessage().
  window.addEventListener('message', postMessageHandler, {passive: true});

  // Put these variables in the global scope for better debugging.
  (window as {} as {m: {}}).m = m;
  (window as {} as {globals: {}}).globals = globals;

  // /?s=xxxx for permalinks.
  const stateHash = Router.param('s');
  if (stateHash) {
    globals.dispatch(Actions.loadPermalink({
      hash: stateHash,
    }));
  }

  // Prevent pinch zoom.
  document.body.addEventListener('wheel', (e: MouseEvent) => {
    if (e.ctrlKey) e.preventDefault();
  }, {passive: false});

  router.navigateToCurrentHash();

  MicroModal.init();
}

main();
