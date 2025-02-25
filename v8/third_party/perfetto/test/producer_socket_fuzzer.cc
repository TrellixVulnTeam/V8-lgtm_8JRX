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

#include "perfetto/base/build_config.h"
#include "perfetto/ext/base/unix_socket.h"
#include "src/base/test/test_task_runner.h"
#include "test/test_helper.h"

namespace perfetto {
namespace socket_fuzz {
// If we're building on Android and starting the daemons ourselves,
// create the sockets in a world-writable location.
#if PERFETTO_BUILDFLAG(PERFETTO_OS_ANDROID) && \
    PERFETTO_BUILDFLAG(PERFETTO_START_DAEMONS)
#define TEST_PRODUCER_SOCK_NAME "/data/local/tmp/traced_producer"
#else
#define TEST_PRODUCER_SOCK_NAME ::perfetto::GetProducerSocket()
#endif

class FakeEventListener : public base::UnixSocket::EventListener {
 public:
  FakeEventListener(const uint8_t* data,
                    size_t size,
                    std::function<void()> data_sent_callback)
      : data_(data), size_(size), data_sent_(data_sent_callback) {}

  void OnNewIncomingConnection(base::UnixSocket*,
                               std::unique_ptr<base::UnixSocket>) override {
    PERFETTO_CHECK(false);
  }

  void OnConnect(base::UnixSocket* self, bool connected) override {
    PERFETTO_CHECK(connected && self->is_connected());
    PERFETTO_CHECK(self->Send(data_, size_, self->fd(),
                              base::UnixSocket::BlockingMode::kBlocking));
    data_sent_();
  }

  void OnDisconnect(base::UnixSocket*) override { PERFETTO_CHECK(false); }
  void OnDataAvailable(base::UnixSocket*) override { PERFETTO_CHECK(false); }

 private:
  const uint8_t* data_;
  const size_t size_;
  std::function<void()> data_sent_;
};

int FuzzSharedMemory(const uint8_t* data, size_t size);

int FuzzSharedMemory(const uint8_t* data, size_t size) {
  if (!data)
    return 0;
  base::TestTaskRunner task_runner;

  TestHelper helper(&task_runner);
  helper.StartServiceIfRequired();

  FakeEventListener fake_event_listener(
      data, size, task_runner.CreateCheckpoint("data_sent"));

  std::unique_ptr<base::UnixSocket> sock = base::UnixSocket::Connect(
      helper.GetProducerSocketName(), &fake_event_listener, &task_runner);

  task_runner.RunUntilCheckpoint("data_sent");
  return 0;
}
}  // namespace socket_fuzz
}  // namespace perfetto

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size);

extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
  return perfetto::socket_fuzz::FuzzSharedMemory(data, size);
}
