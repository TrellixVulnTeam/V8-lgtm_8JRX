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

import {fromNs, toNs} from '../../common/time';
import {LIMIT} from '../../common/track_data';
import {
  TrackController,
  trackControllerRegistry,
} from '../../controller/track_controller';

import {Config, Data, SLICE_TRACK_KIND} from './common';

class ChromeSliceTrackController extends TrackController<Config, Data> {
  static readonly kind = SLICE_TRACK_KIND;
  private setup = false;

  async onBoundsChange(start: number, end: number, resolution: number):
      Promise<Data> {
    const startNs = toNs(start);
    const endNs = toNs(end);
    // Ns in 1px width. We want all slices smaller than 1px to be grouped.
    const minNs = toNs(resolution);

    if (!this.setup) {
      await this.query(
          `create virtual table ${this.tableName('window')} using window;`);

      await this.query(
          `create view ${this.tableName('small')} as ` +
          `select ts,dur,depth,cat,name,slice_id from slices ` +
          `where utid = ${this.config.utid} ` +
          `and ts >= ${startNs} - dur ` +
          `and ts <= ${endNs} ` +
          `and dur < ${minNs} ` +
          `order by ts;`);

      await this.query(`create virtual table ${this.tableName('span')} using
      span_join(${this.tableName('small')},
      ${this.tableName('window')});`);

      this.setup = true;
    }

    const windowDurNs = Math.max(1, endNs - startNs);

    this.query(`update ${this.tableName('window')} set
    window_start=${startNs},
    window_dur=${windowDurNs},
    quantum=${minNs}`);

    await this.query(`drop view if exists ${this.tableName('small')}`);
    await this.query(`drop view if exists ${this.tableName('big')}`);
    await this.query(`drop view if exists ${this.tableName('summary')}`);

    await this.query(
        `create view ${this.tableName('small')} as ` +
        `select ts,dur,depth,cat,name, slice_id from slices ` +
        `where utid = ${this.config.utid} ` +
        `and ts >= ${startNs} - dur ` +
        `and ts <= ${endNs} ` +
        `and dur < ${minNs} ` +
        `order by ts `);

    await this.query(
        `create view ${this.tableName('big')} as ` +
        `select ts,dur,depth,cat,name, slice_id from slices ` +
        `where utid = ${this.config.utid} ` +
        `and ts >= ${startNs} - dur ` +
        `and ts <= ${endNs} ` +
        `and dur >= ${minNs} ` +
        `order by ts `);

    await this.query(`create view ${this.tableName('summary')} as select
      min(ts) as ts,
      ${minNs} as dur,
      depth,
      cat,
      'Busy' as name,
      -1 as slice_id
      from ${this.tableName('span')}
      group by cat, depth, quantum_ts;`);

    const query = `select * from ${this.tableName('summary')} UNION ` +
        `select * from ${this.tableName('big')} order by ts limit ${LIMIT}`;

    const rawResult = await this.query(query);

    if (rawResult.error) {
      throw new Error(`Query error "${query}": ${rawResult.error}`);
    }

    const numRows = +rawResult.numRecords;

    const slices: Data = {
      start,
      end,
      resolution,
      length: numRows,
      strings: [],
      slice_ids: new Float64Array(numRows),
      starts: new Float64Array(numRows),
      ends: new Float64Array(numRows),
      depths: new Uint16Array(numRows),
      titles: new Uint16Array(numRows),
      categories: new Uint16Array(numRows),
    };

    const stringIndexes = new Map<string, number>();
    function internString(str: string) {
      let idx = stringIndexes.get(str);
      if (idx !== undefined) return idx;
      idx = slices.strings.length;
      slices.strings.push(str);
      stringIndexes.set(str, idx);
      return idx;
    }

    for (let row = 0; row < numRows; row++) {
      const cols = rawResult.columns;
      const startSec = fromNs(+cols[0].longValues![row]);
      slices.starts[row] = startSec;
      slices.ends[row] = startSec + fromNs(+cols[1].longValues![row]);
      slices.depths[row] = +cols[2].longValues![row];
      slices.categories[row] = internString(cols[3].stringValues![row]);
      slices.titles[row] = internString(cols[4].stringValues![row]);
      slices.slice_ids[row] = +cols[5].longValues![row];
    }
    return slices;
  }

}


trackControllerRegistry.register(ChromeSliceTrackController);
