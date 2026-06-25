#!/bin/sh
# Host-side build of the suspend-writer spike. Reuses the app's JS renderer.
set -e
cd "$(dirname "$0")"

JS_DIR="$(cd ../../src/js && pwd)"
CXXFLAGS="$(pkg-config --cflags Qt5Core Qt5Gui Qt5Qml) -fPIC"
LIBS="$(pkg-config --libs Qt5Core Qt5Gui Qt5Qml)"

moc main.cpp -o main.moc
g++ -std=c++17 $CXXFLAGS -DJS_DIR="\"$JS_DIR\"" main.cpp -o suspend-writer $LIBS

echo "built ./suspend-writer (JS_DIR=$JS_DIR)"
