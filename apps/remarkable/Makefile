REMARKABLE_HOST ?= remarkable
HOTSPOT_HOST ?= remarkable-hotspot
PROFILE ?= stable
ifeq ($(PROFILE),test)
override APP_ID := habit-tracker-test
override BUILD_DIR := build/test
ifneq ($(filter suspend-writer-device suspend-writer-deploy,$(MAKECMDGOALS)),)
$(error The device suspend-writer is unavailable for test installs; use the app's suspend preview)
endif
else ifeq ($(PROFILE),stable)
override APP_ID := habit-tracker
override BUILD_DIR := build
else
$(error PROFILE must be stable or test)
endif
override REMOTE_DIR := /home/root/xovi/exthome/appload/$(APP_ID)
RCC ?= rcc-qt5
QMLLINT ?= qmllint-qt5
QMLTESTRUNNER ?= qmltestrunner-qt5
QML_IMPORT_PATH ?= /usr/lib/qt/qml
BACKUP_DIR := .backup
ifeq ($(PROFILE),test)
BACKUP_DIR := .backup/test
endif
TEST_DIR := tests
TEST_TMP := $(TEST_DIR)/tmp
QML_FILES := $(shell find src -name '*.qml')
SW_DIR := tools/suspend-writer
SW_REMOTE_DIR := $(REMOTE_DIR)/suspend-writer
SW_JS_MODULES := $(addprefix src/js/,SuspendDraw.js DateUtils.js Entries.js Polarity.js HabitsModel.js)
SCREENSHOT_DIR := tools/readme-screenshots

.PHONY: build inject-pragma deploy remove clean lint test suspend-writer-test backup find-hotspot-ip \
	build-test deploy-test backup-test \
	suspend-writer-host suspend-writer-device suspend-writer-deploy suspend-writer-clean \
	readme-screenshot-host readme-screenshot-clean

build: inject-pragma
	node scripts/stage-profile.mjs $(PROFILE) $(BUILD_DIR)
	cd $(BUILD_DIR) && $(RCC) --binary -o resources.rcc application.qrc
	cp icon.png $(BUILD_DIR)/

build-test:
	$(MAKE) build PROFILE=test

deploy-test:
	$(MAKE) deploy PROFILE=test

backup-test:
	$(MAKE) backup PROFILE=test

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

# Qt Quick Test over tests/tst_*.qml — JS modules and QML stores alike, against live src/.
# Runs on host Qt 5.15, the same Qt the device has. Unlike `lint`, this target must fail the
# build when it fails: no `|| echo skipping` here, and a missing runner is an error.
#
# Stores read and write through Storage.js, i.e. XHR against file:// — Qt 5.15 warns unless the
# two QML_XHR_ALLOW_FILE_* opt-ins are set. tests/tmp is the scratch dir every file test uses;
# it is wiped first so a run never reads a previous run's leftovers.
#
# The two habits-* subdirs exist because XHR cannot mkdir (the same limitation that makes the
# deploy create data/ — ADR 0002), so a HabitsStore test cannot make its own: habits/ is the
# shared working dir, habits-seed/ is left empty for the first-run seeding test.
test:
	node --test tests/build-profile.test.mjs tests/async-storage.test.mjs
	@command -v $(QMLTESTRUNNER) >/dev/null 2>&1 || { echo "$(QMLTESTRUNNER) not found (install qt5-declarative)"; exit 1; }
	rm -rf $(TEST_TMP)
	mkdir -p $(TEST_TMP)/habits $(TEST_TMP)/habits-seed $(TEST_TMP)/power-images $(TEST_TMP)/power-images-linked $(TEST_TMP)/quit
	ln -s rebooting.png $(TEST_TMP)/power-images-linked/restart-crashed.png
	QT_QPA_PLATFORM=offscreen QT_QUICK_BACKEND=software QML_XHR_ALLOW_FILE_READ=1 QML_XHR_ALLOW_FILE_WRITE=1 \
		$(QMLTESTRUNNER) -input $(TEST_DIR) -import $(QML_IMPORT_PATH)

# The data/ subdir must exist before first launch: QML/XHR cannot create it, so
# a missing dir turns every save into a visible failure (see ADR 0002).
deploy: build
	@test "$(PROFILE)" = test || test "$(CONFIRM_STABLE)" = 1 || { echo "Stable install protected. Use make deploy-test, or make deploy CONFIRM_STABLE=1 to replace the stable app."; exit 1; }
	ssh $(REMARKABLE_HOST) "mkdir -p $(REMOTE_DIR)/data"
	scp $(BUILD_DIR)/resources.rcc $(BUILD_DIR)/manifest.json $(BUILD_DIR)/icon.png $(REMARKABLE_HOST):$(REMOTE_DIR)/

remove:
	ssh $(REMARKABLE_HOST) "rm -rf $(REMOTE_DIR)"

# Hotspot leases move, so find the device on the current network by its SSH host
# key and repoint $(HOTSPOT_HOST) in ~/.ssh/config at it. Needs nmap; probes the
# device.
find-hotspot-ip:
	@tools/find-remarkable-hotspot-ip.sh $(HOTSPOT_HOST)

# Pull the device's data/ into a timestamped local backup (e.g. .backup/2026-06-24_14-30-05).
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

# Smoke-test the host build against committed fixtures. Separate from `test` because it needs a
# C++ build: `make test` stays a fast, dependency-free loop. Run this after touching src/js or the
# on-disk shape — neither `build` nor `lint` notices when the tool drifts out of date.
suspend-writer-test: suspend-writer-host
	mkdir -p $(TEST_TMP)
	$(TEST_DIR)/suspend-writer-smoke.sh

# Cross-build for the device (ARM, Qt6) — requires the SDK unpacked at $(SW_DIR)/sdk.
suspend-writer-device:
	$(SW_DIR)/build-device.sh

# Deploy the ARM binary plus the loose JS modules it reads at runtime. The app bundles those
# inside resources.rcc, so they are not otherwise on-device. SuspendDraw.js reaches the other
# four, so all five ship together — see the tool's README.
suspend-writer-deploy: suspend-writer-device
	ssh $(REMARKABLE_HOST) "mkdir -p $(SW_REMOTE_DIR)"
	scp $(SW_DIR)/build/suspend-writer-arm $(REMARKABLE_HOST):$(SW_REMOTE_DIR)/
	scp $(SW_JS_MODULES) $(REMARKABLE_HOST):$(SW_REMOTE_DIR)/

suspend-writer-clean:
	rm -rf $(SW_DIR)/build

# Host-only Qt Quick shell for README captures. It loads the live Main.qml and points its public
# screenshot inputs at temporary fixture files; it is not included in resources.rcc.
readme-screenshot-host:
	$(SCREENSHOT_DIR)/build-host.sh

readme-screenshot-clean:
	rm -rf $(SCREENSHOT_DIR)/build
