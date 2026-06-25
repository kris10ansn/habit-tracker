#!/bin/sh
# Cross-build of the suspend-writer for the reMarkable (ARM, cortexa9hf-neon).
# Needs the reMarkable SDK unpacked at ./sdk (its env-setup script sets $CXX,
# sysroot-aware pkg-config, and $OECORE_NATIVE_SYSROOT for moc). The SDK ships
# Qt6, so this links Qt6 — the device must provide matching Qt6 runtime libs.
#
# Unlike a normal rM Qt app this is headless: it renders a QImage to PNG, so it
# needs no epaper plugin and never stops xochitl. Run it with
# QT_QPA_PLATFORM=offscreen (a minimal/offscreen plugin ships in the sysroot).
#
# Output: ./suspend-writer-arm  (kept separate from the host ./suspend-writer)
set -e
cd "$(dirname "$0")"

ENV_SETUP=sdk/environment-setup-cortexa9hf-neon-remarkable-linux-gnueabi
[ -f "$ENV_SETUP" ] || { echo "SDK env-setup not found at $ENV_SETUP" >&2; exit 1; }
# shellcheck disable=SC1090
. "$ENV_SETUP"

MOC="$OECORE_NATIVE_SYSROOT/usr/libexec/moc"
QT_CFLAGS="$(pkg-config --cflags Qt6Core Qt6Gui Qt6Qml)"
QT_LIBS="$(pkg-config --libs Qt6Core Qt6Gui Qt6Qml)"

"$MOC" main.cpp -o main.moc
# Default JS_DIR is irrelevant on-device; pass --js-dir at runtime.
$CXX -std=c++17 -fPIC $CXXFLAGS $QT_CFLAGS -DJS_DIR='"."' \
    main.cpp -o suspend-writer-arm $QT_LIBS $LDFLAGS

echo "built ./suspend-writer-arm"
file suspend-writer-arm
