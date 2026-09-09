#!/bin/sh
set -eu

cd "$(dirname "$0")"
mkdir -p build

SOURCE_DIR="$(cd ../../src && pwd)"
CXXFLAGS="$(pkg-config --cflags Qt5Core Qt5Gui Qt5Qml Qt5Quick) -fPIC"
LIBS="$(pkg-config --libs Qt5Core Qt5Gui Qt5Qml Qt5Quick)"

g++ -std=c++17 $CXXFLAGS -DSOURCE_DIR="\"$SOURCE_DIR\"" main.cpp -o build/readme-screenshot $LIBS

echo "built ./build/readme-screenshot (SOURCE_DIR=$SOURCE_DIR)"
