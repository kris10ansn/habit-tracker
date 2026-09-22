# Power-image worker

The app ships this executable as `backend/entry` with `loadsBackend: true`.
apploader launches it with a Unix socket path and the app directory as its working
directory. It hosts `src/worker/PowerImageWorker.qml` from the same `resources.rcc`
as the frontend, using the offscreen platform and software Qt Quick renderer.

```text
Main / developer page
  → ImageBackend (snapshot + operation)
  → AppLoad IPC
  → PowerImageWorker (dispatch + completion callback)
  → PowerImageJobs (backup → SuspendCanvas / BootCanvas → signature)
  → fixed image paths, backups, readback verification
  → progress / completion
```

Drawing, image encoding, file reads/writes, and verification run in the worker
process. Habit storage and sync remain in the frontend. This preserves the existing
renderers, private-habit filtering, backup rules, supported-device checks, and
stable/test path separation.

`PowerImageController` in the frontend owns debounce and edit coalescing.
`PowerImageJobs` executes one captured snapshot and reports completion after every
image and its signature have been saved. `SuspendCanvas` only renders PNGs;
developer actions use the same renderers through `SuspendController`.

## Build and test locally

```sh
# Run from apps/remarkable. These commands never contact the tablet.
export REMARKABLE_SDK=/absolute/path/to/sdk
make build                     # stable bundle, including ARM backend/entry
make build PROFILE=test        # isolated test bundle
make image-worker-test         # host Qt 5 build + Python integration tests
make test                      # frontend client and existing QML suites
```

The SDK defaults to `tools/suspend-writer/sdk/` and must contain
`environment-setup-cortexa9hf-neon-remarkable-linux-gnueabi`.
The ARM helper links Qt 6 Quick/QML/Gui/Core from that SDK. The device must have
matching runtime libraries, QtQuick QML imports, and the offscreen QPA plugin.
The frontend continues using apploader's Qt runtime; the processes share JSON,
not Qt objects. Cross-compilation proves build compatibility, not firmware runtime
compatibility. Validate launch and responsiveness on the target tablet after deployment.

The host tests need a C++17 compiler, Qt 5 Quick development packages, `moc`,
`pkg-config`, Python 3, Node.js, and `rcc-qt5`. Tests use the normal profile and
resource staging, without rewriting execution source. The host-only
`IMAGE_WORKER_HOST_TEST` build accepts a fifth argument containing a JSON fixture
configuration (app directory, image directories, and device model).
`ImageEnvironment` supplies those trusted bootstrap values to the renderers.
The device binary omits that configuration argument and uses fixed profile paths
and the device's model; RPC requests cannot override either.

After deploying, the user can check the packaged worker's Qt libraries, QML imports,
offscreen plugin, and renderer readiness from the app directory on the tablet:

```sh
QT_FORCE_STDERR_LOGGING=1 backend/entry --check-runtime
```

This exits successfully with `Power-image worker runtime ready; Qt ...` or reports
a startup error. It does not acquire the image lock or write images. It complements
the user-run AppLoad launch, responsiveness, preview, write, and restore checks;
the host check cannot establish target-firmware compatibility.

## Protocol and lifecycle

The transport follows [rm-appload's protocol](https://github.com/asivery/rm-appload/blob/master/src/protocol.h):
each native-endian 8-byte header (signed type, byte length) and its UTF-8 body are
separate SOCK_SEQPACKET records. Type 1 carries requests; type 2 carries replies.
System messages -1/-2/-3 handle termination and frontend attachment changes.

`ImageProtocol.js` defines version 1 and the accepted operations. Requests carry a
unique id, an operation, and (for rendering) a date plus projected habits. The
frontend limits messages to 60 KB; malformed snapshots and developer operations
in stable bundles are rejected. The helper owns all paths through BuildProfile and
the existing controllers. PNGs and BMPs never cross IPC.

There is one active operation per helper. A shared QLockFile at
`/tmp/habit-tracker-power-images.lock` excludes simultaneous stable/test jobs.
A busy helper rejects another operation instead of building an unbounded queue.
The UI coalesces automatic updates and blocks overlapping manual actions.

The frontend retries the readiness handshake and reports startup failure after
10 seconds when a job is waiting. A dispatched job has a 120-second inactivity
deadline, refreshed by actual job progress, plus a ten-minute total deadline.
Periodic heartbeats indicate liveness but extend neither deadline. The same bounds
apply when a reopened frontend encounters an already-running job.
Unknown completion disables further requests in
that frontend until reopened; it never retries a potentially completed write or
falls back to synchronous rendering. A frontend timeout does not cancel an
in-flight write or release the worker's lock. If the executable itself cannot start,
apploader may close the frontend before it can show an error.

After the last frontend detaches, the helper completes its accepted job and exits
when idle. Reattaching cancels idle exit. Socket disconnection also lets the job
finish. Quit waits for the newest queued snapshot; forced unload only guarantees
completion of the already accepted snapshot, assuming the worker and device stay
running. The existing image writes are not an atomic multi-file transaction.

Deploy the executable, manifest, and resources together while both app variants
and their jobs are stopped. `make deploy` and `make deploy PROFILE=test` do this
packaging transfer, but must be run by the user under the repository's device rule.
