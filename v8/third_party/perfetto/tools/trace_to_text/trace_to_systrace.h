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

#ifndef TOOLS_TRACE_TO_TEXT_TRACE_TO_SYSTRACE_H_
#define TOOLS_TRACE_TO_TEXT_TRACE_TO_SYSTRACE_H_

#include <iostream>

namespace perfetto {
namespace trace_to_text {

enum class Keep { kStart = 0, kEnd, kAll };

int TraceToSystrace(std::istream* input,
                    std::ostream* output,
                    Keep truncate_keep,
                    bool wrap_in_json);

}  // namespace trace_to_text
}  // namespace perfetto

#endif  // TOOLS_TRACE_TO_TEXT_TRACE_TO_SYSTRACE_H_
