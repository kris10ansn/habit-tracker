#!/bin/sh
# Host-side build of the suspend-writer. Reuses the app's JS renderer and bakes
# the host src/js path as the default JS_DIR, so it runs straight from build/.
# Output: ./build/suspend-writer  (run from this dir; no SDK needed).
set -e
cd "$(dirname "$0")"

mkdir -p build
JS_DIR="$(cd ../../src/js && pwd)"
CXXFLAGS="$(pkg-config --cflags Qt5Core Qt5Gui Qt5Qml Qt5Network) -fPIC"
LIBS="$(pkg-config --libs Qt5Core Qt5Gui Qt5Qml Qt5Network)"

moc Renderer.cpp -o build/Renderer.moc
g++ -DPOWER_IMAGE_TESTING -std=c++17 $CXXFLAGS -Ibuild -DJS_DIR="\"$JS_DIR\"" main.cpp Renderer.cpp PowerImageService.cpp -o build/suspend-writer $LIBS

echo "built ./build/suspend-writer (JS_DIR=$JS_DIR)"
