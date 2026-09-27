#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
WRITER_SDK=${REMARKABLE_SDK:-../remarkable/tools/suspend-writer/sdk}
WRITER_SDK=$(cd "$WRITER_SDK" && pwd)
. "$WRITER_SDK/environment-setup-cortexa9hf-neon-remarkable-linux-gnueabi"
mkdir -p build/device
# The SDK compiler and flags select the ARM sysroot; no device connection is made.
$CXX -std=c++17 -Wall -Wextra -Wpedantic $CXXFLAGS $(pkg-config --cflags Qt6Core Qt6Gui) \
    src/Model.cpp src/Renderer.cpp src/Files.cpp src/Writer.cpp src/AppLoad.cpp src/main.cpp \
    -o build/device/power-image-writer $(pkg-config --libs Qt6Core Qt6Gui) $LDFLAGS
