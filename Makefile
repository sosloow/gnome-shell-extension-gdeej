NAME=deej
DOMAIN=kareraisu.me
LOCAL_EXTENSIONS_PATH=~/.local/share/gnome-shell/extensions

.PHONY: all pack install clean

.DELETE_ON_ERROR:

dist:
	mkdir -p dist

all: dist/extension.js \
	dist/schemas \
	dist/assets \
	dist/$(NAME).gresource \
	dist/metadata.json

.npm-install.stamp: package.json
	npm install --no-audit
	touch $@

TS_FILES := $(shell find src -name "*.ts")

dist/extension.js: $(TS_FILES) .npm-install.stamp tsconfig.json | dist
	npx tsc

BLP_FILES := $(wildcard assets/ui/*.blp)
UI_FILES := $(patsubst assets/ui/%.blp,dist/assets/ui/%.ui,$(BLP_FILES))

dist/assets/ui/%.ui: assets/ui/%.blp | dist/assets/ui
	blueprint-compiler compile --output $@ $<

dist/assets/ui:
	mkdir -p $@

dist/schemas: schemas/gschemas.compiled | dist
	rm -rf $@
	cp -r schemas $@

dist/assets: assets/css/stylesheet.css | dist
	mkdir -p dist/assets
	cp -r assets/* dist/assets/
	rm -rf dist/assets/ui
	mkdir -p dist/assets/ui

dist/metadata.json: metadata.json | dist
	cp $< $@

dist/$(NAME).gresource: assets/org.gnome.shell.extensions.$(NAME).gresource.xml $(UI_FILES) | dist/assets
	glib-compile-resources \
		$< \
		--sourcedir=dist/assets \
		--target=$@

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.$(NAME).gschema.xml
	glib-compile-schemas schemas

pack: all
	cd dist && zip ../$(NAME).zip -9r .

install: all
	rm -rf $(LOCAL_EXTENSIONS_PATH)/$(NAME)@$(DOMAIN)
	cp -r dist $(LOCAL_EXTENSIONS_PATH)/$(NAME)@$(DOMAIN)

clean:
	rm -rf dist $(NAME).zip .npm-install.stamp
