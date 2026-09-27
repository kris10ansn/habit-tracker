# Writer performance comparison

Measured on 2026-09-27 using the actual AppLoad workers from PR #53 and the native writer.
The native writer completes a changed full batch in roughly half the time on this Linux host.
These are host measurements, not reMarkable hardware timings.

| Changed request                  | PR #53 QML writer | Current native writer | Speedup | Less time |
| -------------------------------- | ----------------: | --------------------: | ------: | --------: |
| One suspend PNG, 5 public habits |            523 ms |                363 ms |   1.44× |       31% |
| Full batch, 5 public habits      |          3,936 ms |              1,953 ms |   2.02× |       50% |
| Full batch, 30 public habits     |          3,755 ms |              1,763 ms |   2.13× |       53% |

Each number is the median of 12 measured requests after two warmups and an initial batch.
A full batch writes seven PNG targets and two boot BMP targets, covering all six screen states.
The single-image case uses automatic test-profile rendering. Every measured changed request
changes a public habit mark; progress assertions confirm that every expected image is written.
These are complete worker jobs, including rendering, encoding, installation, and verification.

## Does the readability refactor cost performance?

| Changed request           | Initial native implementation | After readability refactor | Change in time |
| ------------------------- | ----------------------------: | -------------------------: | -------------: |
| One suspend PNG, 5 habits |                        363 ms |                     363 ms |         +0.15% |
| Full batch, 5 habits      |                      1,970 ms |                   1,953 ms |         −0.89% |
| Full batch, 30 habits     |                      1,769 ms |                   1,763 ms |         −0.39% |

The median differences are below 1%, and the middle halves of the sample ranges overlap in all
three cases. This run provides no evidence of a material rendering slowdown from the added
abstractions, guard clauses, or spacing. It is not a statistical proof of identical performance.

The measured commits are fixed: PR #53 at `b7046f9`, initial native at `0918d4e`, and native after
the readability changes at `0dc5567`. The later namespace indentation and startup-configuration
extraction are outside this timing run; neither changes the rendering path.

## Method and limits

- AMD Ryzen 7 5800U, Linux x86_64, Qt 5.15.19, GCC 16.2.1. All three binaries use
  `-O2 -g -DNDEBUG` and C++17. The old worker is explicitly optimized because its default host
  build script does not enable optimization. Production uses ARM/Qt 6, which is not measured here.
- Each implementation runs as a persistent worker over its real Unix `SOCK_SEQPACKET` protocol.
  The QML baseline uses its packaged Canvas/JavaScript image pipeline, not the standalone preview
  tool. Native workers read saved device JSON; the baseline receives the equivalent habit snapshot.
- Timing starts before sending the render request and ends on its successful `done` reply.
  Frontend save/debounce time, snapshot/fingerprint preparation, process startup, and e-ink refresh
  are excluded. Initial startup and first-batch observations are recorded separately in the raw
  data, but one observation per case is insufficient for a startup comparison.
- Workers use separate disposable directories, the same habits/date, existing originals for all
  targets, and retained backups after initialization. The five-habit fixture also contains one
  private habit, which is excluded from the images. The 30-habit fixture is synthetic.
- Variant order is shuffled deterministically each round; all workers and the harness are pinned
  to CPU 15. This is a shared development machine, with ordinary host filesystem/page-cache
  effects. It does not model tablet flash latency, power use, UI responsiveness, or e-ink updates.
- The 30-habit image is not simply a larger copy of the five-habit image: layout density and image
  compression differ. Compare implementations within each row; the rows are not a scaling curve.

The native worker also completes an identical repeated request in a median **2.5–5.5 ms** by
skipping an already successful batch. The old worker rewrites the images if such a request reaches
it. **The old frontend already suppresses unchanged requests**, so this worker-level difference
must not be presented as an additional speedup for normal unchanged UI activity. The table above
uses changed requests only.

[Raw samples, timing ranges, output sizes, and provenance](../benchmarks/results-2026-09-27.json)
are retained alongside the [host-only benchmark harness](../benchmarks/compare-workers.py).
The harness uses Python's standard library and is neither deployed nor part of runtime rendering.

## Reproduce on a Linux host

Run from the repository root with Qt 5 Core/Gui/Quick development files, CMake, a C++ compiler,
`moc`, `rcc-qt5`, Node, and Python 3 installed. Everything below builds and writes temporary host
files; it does not access a tablet. Use an idle machine for more stable numbers.

```sh
benchmark_root=$(mktemp -d /tmp/power-writer-benchmark.XXXXXX)
mkdir -p "$benchmark_root/old" "$benchmark_root/initial" "$benchmark_root/current"
git archive b7046f9 | tar -x -C "$benchmark_root/old"
git archive 0918d4e | tar -x -C "$benchmark_root/initial"
git archive 0dc5567 | tar -x -C "$benchmark_root/current"

(
    cd "$benchmark_root/old/apps/remarkable/tools/image-worker"
    mkdir -p build/host
    moc main.cpp -o build/host/main.moc
    c++ -O2 -g -DNDEBUG -DIMAGE_WORKER_HOST_TEST -std=c++17 -Wall -Wextra -fPIC \
        $(pkg-config --cflags Qt5Quick) -Ibuild/host main.cpp -o build/image-worker \
        $(pkg-config --libs Qt5Quick)
)

for version in initial current; do
    cmake -S "$benchmark_root/$version/apps/power-image-writer" \
        -B "$benchmark_root/$version/build" -DCMAKE_BUILD_TYPE=RelWithDebInfo \
        -DPOWER_IMAGE_QT_MAJOR=5 -DPOWER_IMAGE_HOST_TEST=ON -DBUILD_TESTING=OFF
    cmake --build "$benchmark_root/$version/build" --parallel 4
done

python3 apps/power-image-writer/benchmarks/compare-workers.py \
    --baseline-tree "$benchmark_root/old" \
    --initial-binary "$benchmark_root/initial/build/power-image-writer" \
    --current-binary "$benchmark_root/current/build/power-image-writer" \
    --samples 12 --warmup 2 --out "$benchmark_root/results.json"
```

The harness selects the last CPU allowed by the current process affinity. The output JSON includes
that CPU index, every measured sample, and the excluded first-batch/startup observations.
