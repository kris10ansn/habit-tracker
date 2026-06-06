REMARKABLE_HOST ?= remarkable
APP_ID := habit-tracker
REMOTE_DIR := /home/root/xovi/exthome/appload/$(APP_ID)
RCC ?= rcc-qt5
QMLLINT ?= qmllint-qt5
QML_IMPORT_PATH ?= /usr/lib/qt/qml
BUILD_DIR := build
QML_FILES := $(shell find ui -name '*.qml')

.PHONY: build inject-pragma deploy remove clean lint

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
	@command -v qmllint-qt5 >/dev/null 2>&1 && qmllint-qt5 src/*.qml src/components/*.qml || echo "qmllint-qt5 not installed; skipping"

deploy: build
	ssh $(REMARKABLE_HOST) "mkdir -p $(REMOTE_DIR)"
	scp $(BUILD_DIR)/resources.rcc $(BUILD_DIR)/manifest.json $(BUILD_DIR)/icon.png $(REMARKABLE_HOST):$(REMOTE_DIR)/

remove:
	ssh $(REMARKABLE_HOST) "rm -rf $(REMOTE_DIR)"

clean:
	rm -rf $(BUILD_DIR)

lint:
	$(QMLLINT) -I $(QML_IMPORT_PATH) $(QML_FILES)
