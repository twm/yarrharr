# Generate raster and optimized versions of the Yarrharr icon.
# Copyright 2013, 2014, 2017 Tom Most <twm@freecog.net>; GPLv3+
#
# This Make include file depends on the V, SCOUR and SCOURFLAGS variables being
# defined by the caller.  It appends icon output files to STATIC_TARGETS.

YARRHARR_ICON_SOURCE := assets/art/icon.inkscape.svg

# SVG-TO-PNG infile,outfile,size
define SVG-TO-PNG
STATIC_TARGETS += $(1)

$(1): $(YARRHARR_ICON_SOURCE)
	$$(V)mkdir -p "$$(dir $$@)"
	@echo "INKSCAPE $$@"
	$$(V)inkscape -f "$$<" --export-png="$$@" -w "$(2)" -h "$(2)" --export-area-page >/dev/null 2>&1
	@echo "OPTIPNG $$@"
	$$(V)optipng -quiet "$$@"
endef

# PNG raster icons in all the standard sizes.
$(eval $(call SVG-TO-PNG,yarrharr/static/icon.16.png,16))
$(eval $(call SVG-TO-PNG,yarrharr/static/icon.24.png,24))
$(eval $(call SVG-TO-PNG,yarrharr/static/icon.32.png,32))
$(eval $(call SVG-TO-PNG,yarrharr/static/icon.48.png,48))
$(eval $(call SVG-TO-PNG,yarrharr/static/icon.64.png,64))
# Firefox OS wants a 60x60 PNG.
$(eval $(call SVG-TO-PNG,yarrharr/static/icon.fxos.png,60))
# Android and iOS are crazy (see <http://mathiasbynens.be/notes/touch-icons>).
# Just generate one big 152x152 icon for both; it simply isn't worth the HTML
# clutter to generate one of each size and link to them.  This should also work
# for Opera and Chrome's speed dial features.
$(eval $(call SVG-TO-PNG,yarrharr/static/icon.touch.png,152))

# Generate a .ico to be used as a favicon.  .ico has the best browser support
# of any format (notably, IE doesn't support anything else).
STATIC_TARGETS += yarrharr/static/icon.ico
yarrharr/static/icon.ico: \
		yarrharr/static/icon.16.png \
		yarrharr/static/icon.24.png \
		yarrharr/static/icon.32.png \
		yarrharr/static/icon.64.png
	@echo "ICOTOOL $@"
	$(V)icotool --create -o $@ $^

# And a nicely squished SVG.
STATIC_TARGETS += yarrharr/static/icon.svg

yarrharr/static/icon.svg: assets/art/icon.inkscape.svg
	@echo "SCOUR $@"
	$(V)$(SCOUR) -i "$<" -o "$@" $(SCOURFLAGS) >/dev/null 2>&1
