NAME=deej
DOMAIN=kareraisu.me

.PHONY: dist pack install clean

node_modules: package.json
	npm install --no-audit

dist: schemas/gschemas.compiled
	npx tsc
	@cp -r schemas dist/
	@cp -r assets dist/
	@cp metadata.json dist/

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.$(NAME).gschema.xml
	glib-compile-schemas schemas

pack: dist
	@(cd dist && zip ../$(NAME).zip -9r .)

install: dist
	@touch ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)
	@rm -rf ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)
	@cp -r dist ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)

clean:
	@rm -rf dist $(NAME).zip