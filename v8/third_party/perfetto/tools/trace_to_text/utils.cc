/*
 * Copyright (C) 2018 The Android Open Source Project
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

#include "tools/trace_to_text/utils.h"

#include <inttypes.h>
#include <stdio.h>

#include <memory>
#include <ostream>
#include <utility>

#include "perfetto/base/logging.h"
#include "perfetto/ext/base/string_splitter.h"
#include "perfetto/ext/traced/sys_stats_counters.h"
#include "protos/perfetto/trace/ftrace/ftrace_stats.pb.h"

#include "protos/perfetto/trace/trace.pb.h"
#include "protos/perfetto/trace/trace_packet.pb.h"

namespace perfetto {
namespace trace_to_text {

void ForEachPacketBlobInTrace(
    std::istream* input,
    const std::function<void(std::unique_ptr<char[]>, size_t)>& f) {
  size_t bytes_processed = 0;
  // The trace stream can be very large. We cannot just pass it in one go to
  // libprotobuf as that will refuse to parse messages > 64MB. However we know
  // that a trace is merely a sequence of TracePackets. Here we just manually
  // tokenize the repeated TracePacket messages and parse them individually
  // using libprotobuf.
  for (uint32_t i = 0;; i++) {
    if ((i & 0x3f) == 0) {
      fprintf(stderr, "Processing trace: %8zu KB%c", bytes_processed / 1024,
              kProgressChar);
      fflush(stderr);
    }
    // A TracePacket consists in one byte stating its field id and type ...
    char preamble;
    input->get(preamble);
    if (!input->good())
      break;
    bytes_processed++;
    PERFETTO_DCHECK(preamble == 0x0a);  // Field ID:1, type:length delimited.

    // ... a varint stating its size ...
    uint32_t field_size = 0;
    uint32_t shift = 0;
    for (;;) {
      char c = 0;
      input->get(c);
      field_size |= static_cast<uint32_t>(c & 0x7f) << shift;
      shift += 7;
      bytes_processed++;
      if (!(c & 0x80))
        break;
    }

    // ... and the actual TracePacket itself.
    std::unique_ptr<char[]> buf(new char[field_size]);
    input->read(buf.get(), static_cast<std::streamsize>(field_size));
    bytes_processed += field_size;

    f(std::move(buf), field_size);
  }
}

void ForEachPacketInTrace(
    std::istream* input,
    const std::function<void(const protos::TracePacket&)>& f) {
  ForEachPacketBlobInTrace(
      input, [f](std::unique_ptr<char[]> buf, size_t size) {
        protos::TracePacket packet;
        auto res = packet.ParseFromArray(buf.get(), static_cast<int>(size));
        if (!res) {
          PERFETTO_ELOG("Skipping invalid packet");
          return;
        }
        f(packet);
      });
  fprintf(stderr, "\n");
}

std::vector<std::string> GetPerfettoBinaryPath() {
  std::vector<std::string> roots;
  const char* root = getenv("PERFETTO_BINARY_PATH");
  if (root != nullptr) {
    for (base::StringSplitter sp(std::string(root), ':'); sp.Next();)
      roots.emplace_back(sp.cur_token(), sp.cur_token_size());
  }
  return roots;
}

}  // namespace trace_to_text
}  // namespace perfetto
