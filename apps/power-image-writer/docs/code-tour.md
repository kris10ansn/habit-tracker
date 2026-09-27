# Reading the native writer

Start with `Writer::execute` in [Writer.cpp](../src/Writer.cpp). It reads as a job handler:
check the operation, choose image targets, confirm the setting, capture saved data, then back up
and render or restore. It knows nothing about sockets, JSON messages, event loops, or threads.
`Request`, `SavedDataFingerprint`, and `ProgressEvent` in [Writer.h](../src/Writer.h) are ordinary
records, comparable to C# records, Kotlin data classes, or TypeScript object types.

| Module                        | Responsibility                                                          | Start here when changing…                         |
| ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| `Writer`                      | Runs image jobs using injected `Files` and `Environment`                | Backup/restore ordering, opt-in, target selection |
| `Model`                       | Validates saved JSON and creates a value snapshot                       | Privacy, tombstones, marks, saved-data shape      |
| `Renderer` / `RenderedImages` | Draws the layout; caches one base grid and each encoded state per batch | Screen appearance or encoding                     |
| `Files` / `LocalFiles`        | File access interface and its atomic, verified implementation           | Disk behavior or failure injection                |
| `WriterProtocol`              | Converts between JSON messages and typed requests/progress              | QML ↔ writer message format                       |
| `AppLoadSession`              | Runs one accepted job on a worker thread and forwards progress          | App lifecycle, busy state, job completion         |
| `AppLoadConnection`           | Exchanges packets over the launcher's local socket                      | AppLoad's transport format                        |
| `main.cpp`                    | Constructs dependencies and selects standalone or AppLoad mode          | CLI options and startup                           |

## Why AppLoad is involved

AppLoad is the tablet's launcher (`rm-appload`). It loads the QML frontend inside the tablet's UI
process and starts our separate `backend/entry` process. Objects in those two processes cannot
call each other's methods directly, so AppLoad gives them a local Unix socket. This is similar
to a named pipe between two C# processes; it is not an Internet connection or the sync server.

```text
QML: render saved data
  → AppLoad's local socket
  → AppLoadConnection: decode packet
  → WriterProtocol: validate JSON and construct Request
  → AppLoadSession: run job on its worker thread
  → Writer: capture → backup → render → verify
  ← typed progress → JSON reply → local socket → QML status text
```

The session uses ordinary Qt signals for connection events, much like C# events. CMake runs Qt's
`moc` code generator automatically. Image work runs on one `QThread`; queued calls deliver its
progress back to the event-loop thread, which alone touches the socket and timers. The session
waits for accepted work before destruction. The standalone CLI calls the same writer directly
and does not need an AppLoad connection.

## Why there is a Python file

[process_tests.py](../tests/process_tests.py) is a host-only integration-test harness, analogous
to a test project that launches an application and drives it from the outside. Python's standard
library supplies temporary directories, process management, Unix sockets, and assertions without
additional packages. It acts as AppLoad, exchanges the real packets, and checks the actual PNG/BMP
files, progress, locks, and process exit behavior. It contains no rendering or application logic
and is neither deployed nor required on the tablet.

[writer_tests.cpp](../tests/writer_tests.cpp) exercises the writer in-process, using `MemoryFiles`
to simulate disk failures. CTest runs both suites through `make power-image-writer-test`.

## The C++ conventions used here

- `const T &` is a borrowed read-only argument. It avoids copying; the caller retains ownership.
- `T &` is a borrowed dependency, like `Files &files` in the writer constructor. There is no DI
  container; the executable supplies `LocalFiles`, while tests supply `MemoryFiles`.
- `std::optional<T>` represents an optional value, similar to a nullable Kotlin value. For example,
  only image-saving progress has a remaining-image count; the last image has a count of zero.
- `std::function<void(const ProgressEvent &)>` is a callback, similar to `Action<ProgressEvent>`.
- `std::unique_ptr<QThread>` owns exactly one thread object. Destructors release resources when
  their owner goes out of scope: the same purpose as `using`/`Dispose`, without a separate call.
- `std::move` transfers a value into its owner. Qt strings, byte arrays, images, and containers
  also share storage until changed, so returning a cached image's bytes does not copy every byte.

These abstractions keep the existing one-grid/one-encoding-per-state behavior. The job does not
create additional threads, redraw cached states, or add virtual calls to the pixel loops. Rendering
coordinates and native image formats stay in the renderer rather than being wrapped in a second
drawing framework.
