/*
 * Copyright (C) 2017 The Android Open Source Project
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

/*******************************************************************************
 * AUTOGENERATED - DO NOT EDIT
 *******************************************************************************
 * This file has been generated from the protobuf message
 * protos/perfetto/config/data_source_config.proto
 * by
 * ../../tools/proto_to_cpp/proto_to_cpp.cc.
 * If you need to make changes here, change the .proto file and then run
 * ./tools/gen_tracing_cpp_headers_from_protos
 */

#ifndef INCLUDE_PERFETTO_TRACING_CORE_DATA_SOURCE_CONFIG_H_
#define INCLUDE_PERFETTO_TRACING_CORE_DATA_SOURCE_CONFIG_H_

#include <stdint.h>
#include <string>
#include <type_traits>
#include <vector>

#include "perfetto/base/copyable_ptr.h"
#include "perfetto/base/export.h"

// Forward declarations for protobuf types.
namespace perfetto {
namespace protos {
class DataSourceConfig;
class ChromeConfig;
class TestConfig;
class TestConfig_DummyFields;
}  // namespace protos
}  // namespace perfetto

namespace perfetto {
class DataSourceConfig;
class ChromeConfig;
class TestConfig;

class PERFETTO_EXPORT DataSourceConfig {
 public:
  DataSourceConfig();
  ~DataSourceConfig();
  DataSourceConfig(DataSourceConfig&&) noexcept;
  DataSourceConfig& operator=(DataSourceConfig&&);
  DataSourceConfig(const DataSourceConfig&);
  DataSourceConfig& operator=(const DataSourceConfig&);
  bool operator==(const DataSourceConfig&) const;
  bool operator!=(const DataSourceConfig& other) const {
    return !(*this == other);
  }

  // Raw proto decoding.
  void ParseRawProto(const std::string&);
  // Conversion methods from/to the corresponding protobuf types.
  void FromProto(const perfetto::protos::DataSourceConfig&);
  void ToProto(perfetto::protos::DataSourceConfig*) const;

  const std::string& name() const { return name_; }
  void set_name(const std::string& value) { name_ = value; }

  uint32_t target_buffer() const { return target_buffer_; }
  void set_target_buffer(uint32_t value) { target_buffer_ = value; }

  uint32_t trace_duration_ms() const { return trace_duration_ms_; }
  void set_trace_duration_ms(uint32_t value) { trace_duration_ms_ = value; }

  uint32_t stop_timeout_ms() const { return stop_timeout_ms_; }
  void set_stop_timeout_ms(uint32_t value) { stop_timeout_ms_ = value; }

  bool enable_extra_guardrails() const { return enable_extra_guardrails_; }
  void set_enable_extra_guardrails(bool value) {
    enable_extra_guardrails_ = value;
  }

  uint64_t tracing_session_id() const { return tracing_session_id_; }
  void set_tracing_session_id(uint64_t value) { tracing_session_id_ = value; }

  const std::string& ftrace_config_raw() const { return ftrace_config_; }
  void set_ftrace_config_raw(const std::string& raw) { ftrace_config_ = raw; }

  const std::string& inode_file_config_raw() const {
    return inode_file_config_;
  }
  void set_inode_file_config_raw(const std::string& raw) {
    inode_file_config_ = raw;
  }

  const std::string& process_stats_config_raw() const {
    return process_stats_config_;
  }
  void set_process_stats_config_raw(const std::string& raw) {
    process_stats_config_ = raw;
  }

  const std::string& sys_stats_config_raw() const { return sys_stats_config_; }
  void set_sys_stats_config_raw(const std::string& raw) {
    sys_stats_config_ = raw;
  }

  const std::string& heapprofd_config_raw() const { return heapprofd_config_; }
  void set_heapprofd_config_raw(const std::string& raw) {
    heapprofd_config_ = raw;
  }

  const std::string& android_power_config_raw() const {
    return android_power_config_;
  }
  void set_android_power_config_raw(const std::string& raw) {
    android_power_config_ = raw;
  }

  const std::string& android_log_config_raw() const {
    return android_log_config_;
  }
  void set_android_log_config_raw(const std::string& raw) {
    android_log_config_ = raw;
  }

  const std::string& gpu_counter_config_raw() const {
    return gpu_counter_config_;
  }
  void set_gpu_counter_config_raw(const std::string& raw) {
    gpu_counter_config_ = raw;
  }

  const std::string& packages_list_config_raw() const {
    return packages_list_config_;
  }
  void set_packages_list_config_raw(const std::string& raw) {
    packages_list_config_ = raw;
  }

  const ChromeConfig& chrome_config() const { return *chrome_config_; }
  ChromeConfig* mutable_chrome_config() { return chrome_config_.get(); }

  const std::string& legacy_config() const { return legacy_config_; }
  void set_legacy_config(const std::string& value) { legacy_config_ = value; }

  const TestConfig& for_testing() const { return *for_testing_; }
  TestConfig* mutable_for_testing() { return for_testing_.get(); }

 private:
  std::string name_{};
  uint32_t target_buffer_{};
  uint32_t trace_duration_ms_{};
  uint32_t stop_timeout_ms_{};
  bool enable_extra_guardrails_{};
  uint64_t tracing_session_id_{};
  std::string ftrace_config_;         // [lazy=true]
  std::string inode_file_config_;     // [lazy=true]
  std::string process_stats_config_;  // [lazy=true]
  std::string sys_stats_config_;      // [lazy=true]
  std::string heapprofd_config_;      // [lazy=true]
  std::string android_power_config_;  // [lazy=true]
  std::string android_log_config_;    // [lazy=true]
  std::string gpu_counter_config_;    // [lazy=true]
  std::string packages_list_config_;  // [lazy=true]
  ::perfetto::base::CopyablePtr<ChromeConfig> chrome_config_;
  std::string legacy_config_{};
  ::perfetto::base::CopyablePtr<TestConfig> for_testing_;

  // Allows to preserve unknown protobuf fields for compatibility
  // with future versions of .proto files.
  std::string unknown_fields_;
};

}  // namespace perfetto

#endif  // INCLUDE_PERFETTO_TRACING_CORE_DATA_SOURCE_CONFIG_H_
