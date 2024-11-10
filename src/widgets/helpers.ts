import GLib from 'gi://GLib';

import { SliderSettings } from './types.js';

export function sliderToVariant(settings: SliderSettings) {
  return GLib.Variant.new('a{sv}', {
    target: GLib.Variant.new_uint16(settings.target),
    'custom-app': GLib.Variant.new_string(settings['custom-app']),
    inverted: GLib.Variant.new_boolean(settings.inverted)
  });
}
