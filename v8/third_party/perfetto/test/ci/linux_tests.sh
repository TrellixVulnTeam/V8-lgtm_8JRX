#!/bin/bash
# Copyright (C) 2019 The Android Open Source Project
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -eux -o pipefail

cd $(dirname ${BASH_SOURCE[0]})/../..

OUT_PATH="out/dist"

tools/install-build-deps --no-android

if [[ -e buildtools/clang/bin/llvm-symbolizer ]]; then
  export ASAN_SYMBOLIZER_PATH="buildtools/clang/bin/llvm-symbolizer"
  export MSAN_SYMBOLIZER_PATH="buildtools/clang/bin/llvm-symbolizer"
fi

tools/gn gen ${OUT_PATH} --args="${PERFETTO_TEST_GN_ARGS}" --check
tools/ninja -C ${OUT_PATH} ${PERFETTO_TEST_NINJA_ARGS}

# Run the tests

${OUT_PATH}/perfetto_unittests
${OUT_PATH}/perfetto_integrationtests
BENCHMARK_FUNCTIONAL_TEST_ONLY=true ${OUT_PATH}/perfetto_benchmarks

mkdir -p /ci/artifacts/perf
tools/diff_test_trace_processor.py \
  --test-type=queries \
  --perf-file=/ci/artifacts/perf/tp-perf-queries.json \
  ${OUT_PATH}/trace_processor_shell
tools/diff_test_trace_processor.py \
  --test-type=metrics \
  --perf-file=/ci/artifacts/perf/tp-perf-metrics.json \
  ${OUT_PATH}/trace_processor_shell
