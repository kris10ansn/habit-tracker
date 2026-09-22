#!/bin/sh
# Local cross-compilation only; this script never contacts the tablet.
set -eu
cd "$(dirname "$0")"
SDK_DIRECTORY=${REMARKABLE_SDK:-../suspend-writer/sdk}
SDK_DIRECTORY=$(cd "$SDK_DIRECTORY" && pwd)
. "$SDK_DIRECTORY/environment-setup-cortexa9hf-neon-remarkable-linux-gnueabi"
mkdir -p build/device
"$OECORE_NATIVE_SYSROOT/usr/libexec/moc" main.cpp -o build/device/main.moc
$CXX -std=c++17 -Wall -Wextra -fPIC $CXXFLAGS $(pkg-config --cflags Qt6Quick) -Ibuild/device main.cpp \
    -o build/image-worker-arm $(pkg-config --libs Qt6Quick) $LDFLAGS
