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

#include "perfetto/tracing/core/data_source_config.h"

#include "protos/perfetto/config/data_source_config.pb.h"

#include "perfetto/tracing/core/chrome_config.h"
#include "protos/perfetto/config/chrome/chrome_config.pb.h"

#include "perfetto/tracing/core/test_config.h"
#include "protos/perfetto/config/test_config.pb.h"

namespace perfetto {

DataSourceConfig::DataSourceConfig() = default;
DataSourceConfig::~DataSourceConfig() = default;
DataSourceConfig::DataSourceConfig(const DataSourceConfig&) = default;
DataSourceConfig& DataSourceConfig::operator=(const DataSourceConfig&) =
    default;
DataSourceConfig::DataSourceConfig(DataSourceConfig&&) noexcept = default;
DataSourceConfig& DataSourceConfig::operator=(DataSourceConfig&&) = default;

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wfloat-equal"
bool DataSourceConfig::operator==(const DataSourceConfig& other) const {
  return (name_ == other.name_) && (target_buffer_ == other.target_buffer_) &&
         (trace_duration_ms_ == other.trace_duration_ms_) &&
         (stop_timeout_ms_ == other.stop_timeout_ms_) &&
         (enable_extra_guardrails_ == other.enable_extra_guardrails_) &&
         (tracing_session_id_ == other.tracing_session_id_) &&
         (ftrace_config_ == other.ftrace_config_) &&
         (inode_file_config_ == other.inode_file_config_) &&
         (process_stats_config_ == other.process_stats_config_) &&
         (sys_stats_config_ == other.sys_stats_config_) &&
         (heapprofd_config_ == other.heapprofd_config_) &&
         (android_power_config_ == other.android_power_config_) &&
         (android_log_config_ == other.android_log_config_) &&
         (gpu_counter_config_ == other.gpu_counter_config_) &&
         (packages_list_config_ == other.packages_list_config_) &&
         (chrome_config_ == other.chrome_config_) &&
         (legacy_config_ == other.legacy_config_) &&
         (for_testing_ == other.for_testing_);
}
#pragma GCC diagnostic pop

void DataSourceConfig::ParseRawProto(const std::string& raw) {
  perfetto::protos::DataSourceConfig proto;
  proto.ParseFromString(raw);
  FromProto(proto);
}

void DataSourceConfig::FromProto(
    const perfetto::protos::DataSourceConfig& proto) {
  static_assert(sizeof(name_) == sizeof(proto.name()), "size mismatch");
  name_ = static_cast<decltype(name_)>(proto.name());

  static_assert(sizeof(target_buffer_) == sizeof(proto.target_buffer()),
                "size mismatch");
  target_buffer_ = static_cast<decltype(target_buffer_)>(proto.target_buffer());

  static_assert(sizeof(trace_duration_ms_) == sizeof(proto.trace_duration_ms()),
                "size mismatch");
  trace_duration_ms_ =
      static_cast<decltype(trace_duration_ms_)>(proto.trace_duration_ms());

  static_assert(sizeof(stop_timeout_ms_) == sizeof(proto.stop_timeout_ms()),
                "size mismatch");
  stop_timeout_ms_ =
      static_cast<decltype(stop_timeout_ms_)>(proto.stop_timeout_ms());

  static_assert(sizeof(enable_extra_guardrails_) ==
                    sizeof(proto.enable_extra_guardrails()),
                "size mismatch");
  enable_extra_guardrails_ = static_cast<decltype(enable_extra_guardrails_)>(
      proto.enable_extra_guardrails());

  static_assert(
      sizeof(tracing_session_id_) == sizeof(proto.tracing_session_id()),
      "size mismatch");
  tracing_session_id_ =
      static_cast<decltype(tracing_session_id_)>(proto.tracing_session_id());

  ftrace_config_ = proto.ftrace_config().SerializeAsString();

  inode_file_config_ = proto.inode_file_config().SerializeAsString();

  process_stats_config_ = proto.process_stats_config().SerializeAsString();

  sys_stats_config_ = proto.sys_stats_config().SerializeAsString();

  heapprofd_config_ = proto.heapprofd_config().SerializeAsString();

  android_power_config_ = proto.android_power_config().SerializeAsString();

  android_log_config_ = proto.android_log_config().SerializeAsString();

  gpu_counter_config_ = proto.gpu_counter_config().SerializeAsString();

  packages_list_config_ = proto.packages_list_config().SerializeAsString();

  chrome_config_->FromProto(proto.chrome_config());

  static_assert(sizeof(legacy_config_) == sizeof(proto.legacy_config()),
                "size mismatch");
  legacy_config_ = static_cast<decltype(legacy_config_)>(proto.legacy_config());

  for_testing_->FromProto(proto.for_testing());
  unknown_fields_ = proto.unknown_fields();
}

void DataSourceConfig::ToProto(
    perfetto::protos::DataSourceConfig* proto) const {
  proto->Clear();

  static_assert(sizeof(name_) == sizeof(proto->name()), "size mismatch");
  proto->set_name(static_cast<decltype(proto->name())>(name_));

  static_assert(sizeof(target_buffer_) == sizeof(proto->target_buffer()),
                "size mismatch");
  proto->set_target_buffer(
      static_cast<decltype(proto->target_buffer())>(target_buffer_));

  static_assert(
      sizeof(trace_duration_ms_) == sizeof(proto->trace_duration_ms()),
      "size mismatch");
  proto->set_trace_duration_ms(
      static_cast<decltype(proto->trace_duration_ms())>(trace_duration_ms_));

  static_assert(sizeof(stop_timeout_ms_) == sizeof(proto->stop_timeout_ms()),
                "size mismatch");
  proto->set_stop_timeout_ms(
      static_cast<decltype(proto->stop_timeout_ms())>(stop_timeout_ms_));

  static_assert(sizeof(enable_extra_guardrails_) ==
                    sizeof(proto->enable_extra_guardrails()),
                "size mismatch");
  proto->set_enable_extra_guardrails(
      static_cast<decltype(proto->enable_extra_guardrails())>(
          enable_extra_guardrails_));

  static_assert(
      sizeof(tracing_session_id_) == sizeof(proto->tracing_session_id()),
      "size mismatch");
  proto->set_tracing_session_id(
      static_cast<decltype(proto->tracing_session_id())>(tracing_session_id_));

  proto->mutable_ftrace_config()->ParseFromString(ftrace_config_);

  proto->mutable_inode_file_config()->ParseFromString(inode_file_config_);

  proto->mutable_process_stats_config()->ParseFromString(process_stats_config_);

  proto->mutable_sys_stats_config()->ParseFromString(sys_stats_config_);

  proto->mutable_heapprofd_config()->ParseFromString(heapprofd_config_);

  proto->mutable_android_power_config()->ParseFromString(android_power_config_);

  proto->mutable_android_log_config()->ParseFromString(android_log_config_);

  proto->mutable_gpu_counter_config()->ParseFromString(gpu_counter_config_);

  proto->mutable_packages_list_config()->ParseFromString(packages_list_config_);

  chrome_config_->ToProto(proto->mutable_chrome_config());

  static_assert(sizeof(legacy_config_) == sizeof(proto->legacy_config()),
                "size mismatch");
  proto->set_legacy_config(
      static_cast<decltype(proto->legacy_config())>(legacy_config_));

  for_testing_->ToProto(proto->mutable_for_testing());
  *(proto->mutable_unknown_fields()) = unknown_fields_;
}

}  // namespace perfetto
