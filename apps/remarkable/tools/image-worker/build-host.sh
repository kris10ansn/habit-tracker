#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p build/host
moc main.cpp -o build/host/main.moc
c++ -DIMAGE_WORKER_HOST_TEST -std=c++17 -Wall -Wextra -fPIC $(pkg-config --cflags Qt5Quick) -Ibuild/host main.cpp \
    -o build/image-worker $(pkg-config --libs Qt5Quick)
