#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
WRITER_SDK=${REMARKABLE_SDK:-../remarkable/tools/suspend-writer/sdk}
WRITER_SDK=$(cd "$WRITER_SDK" && pwd)
. "$WRITER_SDK/environment-setup-cortexa9hf-neon-remarkable-linux-gnueabi"
# Use the same source list and Qt code generation as the host build, with the SDK's ARM toolchain.
cmake -S . -B build/device \
    -DCMAKE_TOOLCHAIN_FILE="$OECORE_NATIVE_SYSROOT/usr/share/cmake/OEToolchainConfig.cmake" \
    -DCMAKE_BUILD_TYPE=RelWithDebInfo -DPOWER_IMAGE_QT_MAJOR=6 \
    -DPOWER_IMAGE_HOST_TEST=OFF -DBUILD_TESTING=OFF
cmake --build build/device --parallel "${WRITER_BUILD_JOBS:-4}"
