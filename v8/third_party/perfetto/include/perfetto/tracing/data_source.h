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

#ifndef INCLUDE_PERFETTO_TRACING_DATA_SOURCE_H_
#define INCLUDE_PERFETTO_TRACING_DATA_SOURCE_H_

// This header contains the key class (DataSource) that a producer app should
// override in order to create a custom data source that gets tracing Start/Stop
// notifications and emits tracing data.

#include <assert.h>
#include <stddef.h>
#include <stdint.h>

#include <array>
#include <atomic>
#include <functional>
#include <memory>
#include <mutex>

#include "perfetto/base/compiler.h"
#include "perfetto/base/export.h"
#include "perfetto/protozero/message.h"
#include "perfetto/protozero/message_handle.h"
#include "perfetto/tracing/internal/basic_types.h"
#include "perfetto/tracing/internal/data_source_internal.h"
#include "perfetto/tracing/internal/tracing_muxer.h"
#include "perfetto/tracing/locked_handle.h"
#include "perfetto/tracing/trace_writer_base.h"
#include "protos/perfetto/trace/trace_packet.pbzero.h"

namespace perfetto {

class DataSourceConfig;

// Base class with the virtual methods to get start/stop notifications.
// Embedders are supposed to derive the templated version below, not this one.
class PERFETTO_EXPORT DataSourceBase {
 public:
  virtual ~DataSourceBase();

  // TODO(primiano): change the const& args below to be pointers instead. It
  // makes it more awkward to handle output arguments and require mutable(s).
  // This requires synchronizing a breaking API change for existing embedders.

  // OnSetup() is invoked when tracing is configured. In most cases this happens
  // just before starting the trace. In the case of deferred start (see
  // deferred_start in trace_config.proto) start might happen later.
  class SetupArgs {
   public:
    // This is valid only within the scope of the OnSetup() call and must not
    // be retained.
    const DataSourceConfig* config = nullptr;
  };
  virtual void OnSetup(const SetupArgs&);

  class StartArgs {};
  virtual void OnStart(const StartArgs&);

  class StopArgs {
   public:
    virtual ~StopArgs();

    // HandleAsynchronously() can optionally be called to defer the tracing
    // session stop and write tracing data just before stopping.
    // This function returns a closure that must be invoked after the last
    // trace events have been emitted. The returned closure can be called from
    // any thread. The caller also needs to explicitly call TraceContext.Flush()
    // from the last Trace() lambda invocation because no other implicit flushes
    // will happen after the stop signal.
    // When this function is called, the tracing service will defer the stop of
    // the tracing session until the returned closure is invoked.
    // However, the caller cannot hang onto this closure for too long. The
    // tracing service will forcefully stop the tracing session without waiting
    // for pending producers after TraceConfig.data_source_stop_timeout_ms
    // (default: 5s, can be overridden by Consumers when starting a trace).
    // If the closure is called after this timeout an error will be logged and
    // the trace data emitted will not be present in the trace. No other
    // functional side effects (e.g. crashes or corruptions) will happen. In
    // other words, it is fine to accidentally hold onto this closure for too
    // long but, if that happens, some tracing data will be lost.
    virtual std::function<void()> HandleStopAsynchronously() const = 0;
  };
  virtual void OnStop(const StopArgs&);
};

// Templated base class meant to be derived by embedders to create a custom data
// source. DataSourceType must be the type of the derived class itself, e.g.:
// class MyDataSource : public DataSourceBase<MyDataSource> {...}.
//
// |IncrementalStateType| can optionally be used store custom per-sequence
// incremental data (e.g., interning tables). It should have a Clear() method
// for when incremental state needs to be cleared. See
// TraceContext::GetIncrementalState().
template <typename DataSourceType, typename IncrementalStateType = void>
class DataSource : public DataSourceBase {
 public:
  // Argument passed to the lambda function passed to Trace() (below).
  class TraceContext {
   public:
    using TracePacketHandle =
        ::protozero::MessageHandle<::perfetto::protos::pbzero::TracePacket>;

    TraceContext(TraceContext&&) noexcept = default;
    ~TraceContext() = default;

    TracePacketHandle NewTracePacket() {
      return tls_inst_->trace_writer->NewTracePacket();
    }

    // Forces a commit of the thread-local tracing data written so far to the
    // service. This is almost never required (tracing data is periodically
    // committed as trace pages are filled up) and has a non-negligible
    // performance hit (requires an IPC + refresh of the current thread-local
    // chunk). The only case when this should be used is when handling OnStop()
    // asynchronously, to ensure sure that the data is committed before the
    // Stop timeout expires.
    // The TracePacketHandle obtained by the last NewTracePacket() call must be
    // finalized before calling Flush() (either implicitly by going out of scope
    // or by explicitly calling Finalize()).
    // |cb| is an optional callback. When non-null it will request the
    // service to ACK the flush and will be invoked on an internal thread after
    // the service has  acknowledged it. The callback might be NEVER INVOKED if
    // the service crashes or the IPC connection is dropped.
    void Flush(std::function<void()> cb = {}) {
      tls_inst_->trace_writer->Flush(cb);
    }

    // Returns a RAII handle to access the data source instance, guaranteeing
    // that it won't be deleted on another thread (because of trace stopping)
    // while accessing it from within the Trace() lambda.
    // The returned handle can be invalid (nullptr) if tracing is stopped
    // immediately before calling this. The caller is supposed to check for its
    // validity before using it. After checking, the handle is guaranteed to
    // remain valid until the handle goes out of scope.
    LockedHandle<DataSourceType> GetDataSourceLocked() {
      auto* internal_state = static_state_.TryGet(instance_index_);
      if (!internal_state)
        return LockedHandle<DataSourceType>();
      return LockedHandle<DataSourceType>(
          &internal_state->lock,
          static_cast<DataSourceType*>(internal_state->data_source.get()));
    }

    IncrementalStateType* GetIncrementalState() {
      return reinterpret_cast<IncrementalStateType*>(
          tls_inst_->incremental_state.get());
    }

   private:
    friend class DataSource;
    TraceContext(internal::DataSourceInstanceThreadLocalState* tls_inst,
                 uint32_t instance_index)
        : tls_inst_(tls_inst), instance_index_(instance_index) {}
    TraceContext(const TraceContext&) = delete;
    TraceContext& operator=(const TraceContext&) = delete;

    internal::DataSourceInstanceThreadLocalState* const tls_inst_;
    uint32_t const instance_index_;
  };

  // The main tracing method. Tracing code should call this passing a lambda as
  // argument, with the following signature: void(TraceContext).
  // The lambda will be called synchronously (i.e., always before Trace()
  // returns) only if tracing is enabled and the data source has been enabled in
  // the tracing config.
  // The lambda can be called more than once per Trace() call, in the case of
  // concurrent tracing sessions (or even if the data source is instantiated
  // twice within the same trace config).
  template <typename Lambda>
  static void Trace(Lambda tracing_fn) {
    constexpr auto kMaxDataSourceInstances = internal::kMaxDataSourceInstances;

    // |instances| is a per-class bitmap that tells:
    // 1. If the data source is enabled at all.
    // 2. The index of the slot within |valid_instances| that holds the instance
    //    state. In turn this allows to map the data source to the tracing
    //    session and buffers.
    // memory_order_relaxed is okay because:
    // - |instances| is re-read with an acquire barrier below if this succeeds.
    // - The code between this point and the acquire-load is based on static
    //    storage which has indefinite lifetime.
    auto instances =
        static_state_.valid_instances.load(std::memory_order_relaxed);

    // This is the tracing fast-path. Bail out immediately if tracing is not
    // enabled (or tracing is enabled but not for this data source).
    if (PERFETTO_LIKELY(!instances))
      return;

    // TODO(primiano): all the stuff below should be outlined. Or at least
    // we should have some compile-time traits like kOptimizeBinarySize /
    // kOptimizeTracingLatency.

    // See tracing_muxer.h for the structure of the TLS.
    auto* tracing_impl = internal::TracingMuxer::Get();
    if (PERFETTO_UNLIKELY(!tls_state_))
      tls_state_ = tracing_impl->GetOrCreateDataSourceTLS(&static_state_);

    // TracingTLS::generation is a global monotonic counter that is incremented
    // every time a tracing session is stopped. We use that as a signal to force
    // a slow-path garbage collection of all the trace writers for the current
    // thread and to destroy the ones that belong to tracing sessions that have
    // ended. This is to avoid having too many TraceWriter instances alive, each
    // holding onto one chunk of the shared memory buffer.
    // Rationale why memory_order_relaxed should be fine:
    // - The TraceWriter object that we use is always constructed and destructed
    //   on the current thread. There is no risk of accessing a half-initialized
    //   TraceWriter (which would be really bad).
    // - In the worst case, in the case of a race on the generation check, we
    //   might end up using a TraceWriter for the same data source that belongs
    //   to a stopped session. This is not really wrong, as we don't give any
    //   guarantee on the global atomicity of the stop. In the worst case the
    //   service will reject the data commit if this arrives too late.

    if (PERFETTO_UNLIKELY(
            tls_state_->root_tls->generation !=
            tracing_impl->generation(std::memory_order_relaxed))) {
      // Will update root_tls->generation.
      tracing_impl->DestroyStoppedTraceWritersForCurrentThread();
    }

    for (uint32_t i = 0; i < kMaxDataSourceInstances; i++) {
      internal::DataSourceState* instance_state =
          static_state_.TryGetCached(instances, i);
      if (!instance_state)
        continue;

      // Even if we passed the check above, the DataSourceInstance might be
      // still destroyed concurrently while this code runs. The code below is
      // designed to deal with such race, as follows:
      // - We don't access the user-defined data source instance state. The only
      //   bits of state we use are |backend_id| and |buffer_id|.
      // - Beyond those two integers, we access only the TraceWriter here. The
      //   TraceWriter is always safe because it lives on the TLS.
      // - |instance_state| is backed by static storage, so the pointer is
      //   always valid, even after the data source instance is destroyed.
      // - In the case of a race-on-destruction, we'll still see the latest
      //   backend_id and buffer_id and in the worst case keep trying writing
      //   into the tracing shared memory buffer after stopped. But this isn't
      //   really any worse than the case of the stop IPC being delayed by the
      //   kernel scheduler. The tracing service is robust against data commit
      //   attemps made after tracing is stopped.
      // There is a theoretical race that would case the wrong behavior w.r.t
      // writing data in the wrong buffer, but it's so rare that we ignore it:
      // if the data source is stopped and started kMaxDataSourceInstances
      // times (so that the same id is recycled) while we are in this function,
      // we might end up reusing the old data source's backend_id and buffer_id
      // for the new one, because we don't see the generation change past this
      // point. But stopping and starting tracing (even once) takes so much
      // handshaking to make this extremely unrealistic.

      auto& tls_inst = tls_state_->per_instance[i];
      if (PERFETTO_UNLIKELY(!tls_inst.trace_writer)) {
        // Here we need an acquire barrier, which matches the release-store made
        // by TracingMuxerImpl::SetupDataSource(), to ensure that the backend_id
        // and buffer_id are consistent.
        instances =
            static_state_.valid_instances.load(std::memory_order_acquire);
        instance_state = static_state_.TryGetCached(instances, i);
        if (!instance_state || !instance_state->trace_lambda_enabled)
          return;
        tls_inst.backend_id = instance_state->backend_id;
        tls_inst.buffer_id = instance_state->buffer_id;
        tls_inst.trace_writer = tracing_impl->CreateTraceWriter(instance_state);
        CreateIncrementalState(&tls_inst,
                               static_cast<IncrementalStateType*>(nullptr));

        // Even in the case of out-of-IDs, SharedMemoryArbiterImpl returns a
        // NullTraceWriter. The returned pointer should never be null.
        assert(tls_inst.trace_writer);
      }

      tracing_fn(TraceContext(&tls_inst, i));
    }
  }

  // Registers the data source on all tracing backends, including ones that
  // connect after the registration. Doing so enables the data source to receive
  // Setup/Start/Stop notifications and makes the Trace() method work when
  // tracing is enabled and the data source is selected.
  // This must be called after Tracing::Initialize().
  // The caller must also use the DEFINE_DATA_SOURCE_STATIC_MEMBERS() macro
  // documented below.
  // Can return false to signal failure if attemping to register more than
  // kMaxDataSources (32) data sources types.
  static bool Register(const DataSourceDescriptor& descriptor) {
    // Silences -Wunused-variable warning in case the trace method is not used
    // by the translation unit that declares the data source.
    (void)static_state_;
    (void)tls_state_;

    auto factory = [] {
      return std::unique_ptr<DataSourceBase>(new DataSourceType());
    };
    auto* tracing_impl = internal::TracingMuxer::Get();
    return tracing_impl->RegisterDataSource(descriptor, factory,
                                            &static_state_);
  }

 private:
  // Create the user provided incremental state in the given thread-local
  // storage. Note: The second parameter here is used to specialize the case
  // where there is no incremental state type.
  template <typename T>
  static void CreateIncrementalState(
      internal::DataSourceInstanceThreadLocalState* tls_inst,
      const T*) {
    PERFETTO_DCHECK(!tls_inst->incremental_state);
    tls_inst->incremental_state =
        internal::DataSourceInstanceThreadLocalState::IncrementalStatePointer(
            reinterpret_cast<void*>(new T()),
            [](void* p) { delete reinterpret_cast<T*>(p); });
  }
  static void CreateIncrementalState(
      internal::DataSourceInstanceThreadLocalState*,
      const void*) {}

  // Static state. Accessed by the static Trace() method fastpaths.
  static internal::DataSourceStaticState static_state_;

  // This TLS object is a cached raw pointer and has deliberately no destructor.
  // The Platform implementation is supposed to create and manage the lifetime
  // of the Platform::ThreadLocalObject and take care of destroying it.
  // This is because non-POD thread_local variables have subtleties (global
  // destructors) that we need to defer to the embedder. In chromium's platform
  // implementation, for instance, the tls slot is implemented using
  // chromium's base::ThreadLocalStorage.
  static thread_local internal::DataSourceThreadLocalState* tls_state_;
};

}  // namespace perfetto

// If a data source is used across translation units, this declaration must be
// placed into the header file defining the data source.
#define PERFETTO_DECLARE_DATA_SOURCE_STATIC_MEMBERS(...)       \
  template <>                                                  \
  perfetto::internal::DataSourceStaticState                    \
      perfetto::DataSource<__VA_ARGS__>::static_state_;        \
  template <>                                                  \
  thread_local perfetto::internal::DataSourceThreadLocalState* \
      perfetto::DataSource<__VA_ARGS__>::tls_state_

// The API client must use this in a translation unit. This is because it needs
// to instantiate the static storage for the datasource to allow the fastpath
// enabled check.
#define PERFETTO_DEFINE_DATA_SOURCE_STATIC_MEMBERS(...)        \
  template <>                                                  \
  perfetto::internal::DataSourceStaticState                    \
      perfetto::DataSource<__VA_ARGS__>::static_state_{};      \
  template <>                                                  \
  thread_local perfetto::internal::DataSourceThreadLocalState* \
      perfetto::DataSource<__VA_ARGS__>::tls_state_ = nullptr

#endif  // INCLUDE_PERFETTO_TRACING_DATA_SOURCE_H_
