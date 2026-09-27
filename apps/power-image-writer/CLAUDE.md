# Native power-state image writer

Read the root guidance and [README](README.md) before changing the writer. For module ownership and C++ conventions, read the [code tour](docs/code-tour.md). The architectural
contract is [ADR 0009](../remarkable/docs/adr/0009-independent-power-state-image-writer.md).

- Keep the renderer on Qt Core/Gui and value-owned input. QML and JavaScript runtimes belong to
  the frontend. The frontend's interactive grid is independent of image layout.
- Read exactly the saved device JSON shape. Keep changes to polarity, tombstones, privacy, or
  mark selection aligned through `tests/habit-contract.json`, exercised by native and QML tests.
- Inject file access at `Files`; keep session exclusion and AppLoad transport outside `Writer`.
  Use value types and scoped ownership for images, sockets, locks, and worker lifetime.
- Preserve backups before any system-image write, and verify complete output bytes. Keep target
  selection fixed in production; arbitrary test directories are compiled in only for host tests.
- Run native unit/process tests and the frontend tests for integration changes. Compare previews
  when changing layout; font antialiasing is host-dependent. Build scripts never access the device.
- Keep the job interface typed (`Request`, `ProgressEvent`); JSON messages belong to `WriterProtocol`,
  socket framing to `AppLoadConnection`, and job lifetime to `AppLoadSession`. Prefer named methods
  and records that a reader from C#/Kotlin can follow; preserve scoped ownership and batch caching.
- Keep background handoff, the single pending snapshot, and completion records in the session layer.
  Acknowledge only after capture and record persistence; keep the image lock across queued batches.
- Format C++ with the local `.clang-format`; indent namespace contents and brace every control-flow block.
- Keep build-specific preprocessor branches together in `LaunchConfiguration`; startup uses its shared API.
- Separate logical phases with blank lines. Prefer descriptive names and explicit intermediate
  values over dense expressions. Keep related statements together rather than spacing every line.
- Prefer guard clauses and early returns to nested conditionals. Extract a named operation when
  branches obscure the main flow; keep control-flow nesting to two levels where practical.
