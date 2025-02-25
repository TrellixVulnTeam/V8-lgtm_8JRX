/*
 * Copyright (C) 2019 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include "src/trace_processor/tables/macros.h"

#include "test/gtest_and_gmock.h"

namespace perfetto {
namespace trace_processor {
namespace {

#define PERFETTO_TP_TEST_EVENT_TABLE_DEF(NAME, PARENT, C) \
  NAME(TestEventTable)                                    \
  PARENT(PERFETTO_TP_ROOT_TABLE_PARENT_DEF, C)            \
  C(int64_t, ts)                                          \
  C(int64_t, arg_set_id)
PERFETTO_TP_TABLE(PERFETTO_TP_TEST_EVENT_TABLE_DEF);

#define PERFETTO_TP_TEST_SLICE_TABLE_DEF(NAME, PARENT, C) \
  NAME(TestSliceTable)                                    \
  PARENT(PERFETTO_TP_TEST_EVENT_TABLE_DEF, C)             \
  C(int64_t, dur)                                         \
  C(int64_t, depth)
PERFETTO_TP_TABLE(PERFETTO_TP_TEST_SLICE_TABLE_DEF);

#define PERFETTO_TP_TEST_CPU_SLICE_TABLE_DEF(NAME, PARENT, C) \
  NAME(TestCpuSliceTable)                                     \
  PARENT(PERFETTO_TP_TEST_SLICE_TABLE_DEF, C)                 \
  C(int64_t, cpu)                                             \
  C(int64_t, priority)
PERFETTO_TP_TABLE(PERFETTO_TP_TEST_CPU_SLICE_TABLE_DEF);

TEST(TableMacrosUnittest, InsertParent) {
  TestEventTable event(nullptr);
  TestSliceTable slice(&event);
  uint32_t id = event.Insert(100, 0);
  ASSERT_EQ(id, 0u);
  ASSERT_EQ(event.ts().Get(0), 100);
  ASSERT_EQ(event.arg_set_id().Get(0), 0);

  id = slice.Insert(200, 123, 10, 0);
  ASSERT_EQ(id, 1u);
  ASSERT_EQ(event.ts().Get(1), 200);
  ASSERT_EQ(event.arg_set_id().Get(1), 123);
  ASSERT_EQ(slice.ts().Get(0), 200);
  ASSERT_EQ(slice.arg_set_id().Get(0), 123);
  ASSERT_EQ(slice.dur().Get(0), 10);
  ASSERT_EQ(slice.depth().Get(0), 0);
}

TEST(TableMacrosUnittest, InsertChild) {
  TestEventTable event(nullptr);
  TestSliceTable slice(&event);
  TestCpuSliceTable cpu_slice(&slice);
  event.Insert(100, 0);
  slice.Insert(200, 123, 10, 0);

  uint32_t id = cpu_slice.Insert(205, 456, 5, 1, 4, 1024);
  ASSERT_EQ(id, 2u);
  ASSERT_EQ(event.ts().Get(2), 205);
  ASSERT_EQ(event.arg_set_id().Get(2), 456);

  ASSERT_EQ(slice.ts().Get(1), 205);
  ASSERT_EQ(slice.arg_set_id().Get(1), 456);
  ASSERT_EQ(slice.dur().Get(1), 5);
  ASSERT_EQ(slice.depth().Get(1), 1);

  ASSERT_EQ(cpu_slice.ts().Get(0), 205);
  ASSERT_EQ(cpu_slice.arg_set_id().Get(0), 456);
  ASSERT_EQ(cpu_slice.dur().Get(0), 5);
  ASSERT_EQ(cpu_slice.depth().Get(0), 1);
  ASSERT_EQ(cpu_slice.cpu().Get(0), 4);
  ASSERT_EQ(cpu_slice.priority().Get(0), 1024);
}

}  // namespace
}  // namespace trace_processor
}  // namespace perfetto
