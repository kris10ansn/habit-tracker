# Native power-state image writer

Read the root guidance and [README](README.md) before changing the writer. The architectural
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
- Format C++ with the local `.clang-format`. Prefer descriptive names and small functions around
  parsing, rendering, installation, and transport responsibilities.
