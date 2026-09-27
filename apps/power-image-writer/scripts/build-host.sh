#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
cmake -S . -B build/host -DCMAKE_BUILD_TYPE=RelWithDebInfo -DPOWER_IMAGE_QT_MAJOR=5 -DPOWER_IMAGE_HOST_TEST=ON -DBUILD_TESTING=ON
cmake --build build/host --parallel "${WRITER_BUILD_JOBS:-4}"
