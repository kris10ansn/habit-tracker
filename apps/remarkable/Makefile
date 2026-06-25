REMARKABLE_HOST ?= remarkable
APP_ID := habit-tracker
REMOTE_DIR := /home/root/xovi/exthome/appload/$(APP_ID)
RCC ?= rcc-qt5
QMLLINT ?= qmllint-qt5
QML_IMPORT_PATH ?= /usr/lib/qt/qml
BUILD_DIR := build
BACKUP_DIR := .backup
QML_FILES := $(shell find src -name '*.qml')
SW_DIR := tools/suspend-writer
SW_REMOTE_DIR := $(REMOTE_DIR)/suspend-writer

.PHONY: build inject-pragma deploy remove clean lint backup \
	suspend-writer-host suspend-writer-device suspend-writer-deploy suspend-writer-clean

build: inject-pragma
	cp application.qrc $(BUILD_DIR)/
	cd $(BUILD_DIR) && $(RCC) --binary -o resources.rcc application.qrc
	cp manifest.json icon.png $(BUILD_DIR)/

# Stage src/ into build/src/ and prepend `.pragma library` to every JS file.
# Sources omit the directive so prettier/VSCode can parse them; Qt requires it
# at runtime for shared-library JS modules.
inject-pragma:
	mkdir -p $(BUILD_DIR)
	rm -rf $(BUILD_DIR)/src
	cp -r src $(BUILD_DIR)/src
	@for f in $(BUILD_DIR)/src/js/*.js; do \
		{ printf '.pragma library\n'; cat "$$f"; } > "$$f.tmp" && mv "$$f.tmp" "$$f"; \
	done

lint:
	@command -v $(QMLLINT) >/dev/null 2>&1 && $(QMLLINT) -I $(QML_IMPORT_PATH) $(QML_FILES) || echo "$(QMLLINT) not installed; skipping"

# The data/ subdir must exist before first launch: QML/XHR cannot create it, so
# a missing dir turns every save into a visible failure (see ADR 0002).
deploy: build
	ssh $(REMARKABLE_HOST) "mkdir -p $(REMOTE_DIR)/data"
	scp $(BUILD_DIR)/resources.rcc $(BUILD_DIR)/manifest.json $(BUILD_DIR)/icon.png $(REMARKABLE_HOST):$(REMOTE_DIR)/

remove:
	ssh $(REMARKABLE_HOST) "rm -rf $(REMOTE_DIR)"

# Pull the device's data/ into a timestamped local backup (e.g. .backups/2026-06-24_14-30-05).
backup:
	mkdir -p $(BACKUP_DIR)
	rsync -avz $(REMARKABLE_HOST):$(REMOTE_DIR)/data/ "$(BACKUP_DIR)/$(shell date +%Y-%m-%d_%H-%M-%S)/"

clean:
	rm -rf $(BUILD_DIR)

# --- suspend-writer: headless renderer for the device suspend image ----------
# A standalone C++ tool (tools/suspend-writer) that reuses the app's JS renderer
# to draw the suspend image off-device. See its README for the SDK setup.

# Host build (Qt5, no SDK) for previewing renders on your machine.
suspend-writer-host:
	$(SW_DIR)/build-host.sh

# Cross-build for the device (ARM, Qt6) — requires the SDK unpacked at $(SW_DIR)/sdk.
suspend-writer-device:
	$(SW_DIR)/build-device.sh

# Deploy the ARM binary plus the two loose JS modules it reads at runtime. The
# app bundles those inside resources.rcc, so they are not otherwise on-device.
suspend-writer-deploy: suspend-writer-device
	ssh $(REMARKABLE_HOST) "mkdir -p $(SW_REMOTE_DIR)"
	scp $(SW_DIR)/build/suspend-writer-arm $(REMARKABLE_HOST):$(SW_REMOTE_DIR)/
	scp src/js/SuspendDraw.js src/js/DateUtils.js $(REMARKABLE_HOST):$(SW_REMOTE_DIR)/

suspend-writer-clean:
	rm -rf $(SW_DIR)/build
