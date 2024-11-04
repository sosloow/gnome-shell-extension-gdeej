NAME=deej
DOMAIN=kareraisu.me
LOCAL_EXTENSIONS_PATH=~/.local/share/gnome-shell/extensions

.PHONY: all pack install clean

.DELETE_ON_ERROR:
all: dist/extension.js \
	dist/prefs.js \
	dist/schemas \
	dist/assets \
	dist/$(NAME).gresource \
	dist/metadata.json

node_modules: package.json
	npm install --no-audit

dist/extension.js dist/prefs.js: src/**/* node_modules
	npx tsc

BLP_FILES := $(wildcard assets/ui/*.blp)
UI_FILES := $(patsubst assets/ui/%.blp,dist/assets/ui/%.ui,$(BLP_FILES))
dist/assets/ui: $(UI_FILES)

dist/assets/ui/%.ui: assets/ui/%.blp
	@mkdir -p dist/assets/ui
	env blueprint-compiler compile --output $@ $<

dist/schemas: schemas/gschemas.compiled
	@cp -r schemas $@

dist/assets: assets
	@cp -r $< $@

dist/metadata.json: metadata.json
	@cp $< $@

dist/$(NAME).gresource: dist/assets/ui
	glib-compile-resources \
		assets/org.gnome.shell.extensions.$(NAME).gresource.xml \
		--target $@ \
		--sourcedir=dist/assets

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.$(NAME).gschema.xml
	glib-compile-schemas schemas

pack: dist
	@(cd dist && zip ../$(NAME).zip -9r .)

install: dist
	@touch $(LOCAL_EXTENSIONS_PATH)/$(NAME)@$(DOMAIN)
	@rm -rf $(LOCAL_EXTENSIONS_PATH)/$(NAME)@$(DOMAIN)
	@cp -r dist $(LOCAL_EXTENSIONS_PATH)/$(NAME)@$(DOMAIN)

clean:
	@rm -rf dist $(NAME).zip
