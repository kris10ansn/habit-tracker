REMARKABLE_HOST ?= remarkable
APP_ID := habit-tracker
REMOTE_DIR := /home/root/xovi/exthome/appload/$(APP_ID)
RCC ?= rcc-qt5
QMLLINT ?= qmllint-qt5
QML_IMPORT_PATH ?= /usr/lib/qt/qml
BUILD_DIR := build
BACKUP_DIR := .backup
QML_FILES := $(shell find src -name '*.qml')

.PHONY: build inject-pragma deploy remove clean lint backup

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
