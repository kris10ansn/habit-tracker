# Independent power-state image writer

Status: accepted

The current image worker runs in a separate process but loads the interactive app's QML and
JavaScript resources, while a second standalone renderer also depends on that JavaScript.
Move power-state image production into an independently usable C++/Qt application that reads
the device's saved JSON data, with one implementation serving app requests and a standalone
command line. This makes the persisted data and the writer's request interface the integration
points instead of the frontend's rendering implementation.

Initially, writing is explicitly requested by the app or command line. Scheduled writing may
be added later through the same writer; autonomous scheduling is outside this extraction.
The refactor covers image generation, previews, and their app integration, preserving the
existing visual design while allowing minor rendering differences. It does not redesign the
interactive habit grid or unrelated QML.

Only successfully persisted data may feed an installed image batch. The app must await
confirmed saves before requesting a render, and every image in that batch must use one
consistent captured input. A failed save prevents a new image batch rather than installing
images containing unsaved edits. The frontend serializes each store's writes and awaits both queues, rechecking current failures.
In one UI turn it fingerprints the confirmed roster and month bytes. The writer captures those
files once and compares their fingerprints before any image writes; changed input is rejected
and requested again. Rendering uses only that immutable value snapshot. This keeps edit/sync
logic in the frontend without embedding a JavaScript runtime or introducing data-file locks.
Standalone commands capture the same files directly after acquiring the app-session check.

Standalone commands initially require the interactive app to be closed. Add a small session-use
check at the command-line integration layer that refuses use while the app is active. Keep this
policy separate from JSON interpretation, rendering, and image installation so it can be removed
or replaced when concurrent standalone use is supported. It must not grow into a new general
coordination service or make ordinary habit editing depend on the renderer.

Normal Quit waits for confirmed local saves and pending sync, then closes once the writer
acknowledges ownership of the latest immutable snapshot. The writer owns one active batch and
at most one pending snapshot; newer handoffs replace only the pending one. Capturing before
acknowledgment protects the accepted work from later edits in a reopened frontend. Ordinary
edits still coalesce in the frontend until a render is requested.

The writer finishes accepted work after frontend detach or socket loss. It retains a small
completion record so failed or interrupted background saves are visible on next launch; this
is not a durable job queue or autonomous scheduler. Reopening during work reattaches to the busy
session and waits for its final completion before ordinary image operations. Backup/restore
and their settings transitions finish in the foreground. A failed save or missing handoff
acknowledgment keeps the app open rather than discarding pending work. This replaces the original
wait-for-all-images Quit policy following the requested background-close behavior.

Use native C++ and Qt Core/Gui for the writer, rendering through QPainter into QImage without
QML, Canvas, or a JavaScript engine. Move image layout and writing into this single implementation
and remove the replaced QML/JavaScript image pipeline. The interactive grid remains in QML.
Keep the C++ input model limited to the fields and rules needed to render saved habit data;
editing and sync behaviour stay in the app.

A small amount of habit interpretation is deliberately implemented in both languages, including
deleted entries, polarity, and mark selection. Common JSON fixtures and expected results must
exercise both implementations to detect drift. This duplicates a bounded set of rules but avoids
maintaining an embedded JavaScript runtime and bridge merely to share them. Preserving the visual
design is verified separately against renders from the existing implementation.

Opt-in, original-backup retention, and privacy requirements apply to both app-triggered and
standalone writing. Enabling prepares backups before persisting enabled and rendering. Disabling
persists disabled before restoring originals; if that save fails, restoration does not start.
If restoration fails, automatic writing stays disabled and the app exposes incomplete restoration
with a retry action. This amends ADR 0001's previous requirement to keep the setting enabled until
restoration succeeds.
