# Power-state image jobs run outside xochitl

Full-size QML Canvas.save calls blocked the UI event loop for roughly 1.5 seconds for three images
and 3.1 seconds for seven in a host Qt 5.15 reproduction. Qt.callLater only postponed the work;
Canvas.Threaded still blocked at save. Power-state rendering, encoding, backup, restore, and
verification now belong to a separate native helper using the existing shared JS renderer.

A loopback service acknowledges immutable snapshot jobs and serializes child workers. This keeps
cancellation and restore responsive even if rendering stalls, and lets accepted jobs finish after
Quit. The frontend uses asynchronous XHR with a per-install token, avoiding an ABI-bound native
plugin inside xochitl. This costs a required helper/service deployment and SDK/runtime compatibility
check. Stable and test installs remain isolated; only explicit test-write/test-restore requests
may change the device suspend image from the test install.

Original backups remain authoritative. Restoring cancels renders and pauses new ones until a
successful backup enables writing again. File replacement preserves symlinks and is atomic per
file, not across the whole batch; the signature advances only on complete success. No frontend
fallback performs synchronous rendering if the helper is unavailable. This amends ADR 0001's
implementation ownership without changing its opt-in, backup, and restore guarantees.

Deterministic tests hold a worker and prove UI input is processed before releasing it. Separate
benchmarks measure maximum UI event-loop gaps; normal CI does not rely on tight machine-dependent
timing limits. Host results still require validation on the tablet's rendering/runtime stack.
