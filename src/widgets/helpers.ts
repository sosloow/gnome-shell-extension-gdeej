import GLib from 'gi://GLib';

import { SliderSettings } from './types.js';

export function sliderToVariant(settings: SliderSettings) {
  return GLib.Variant.new('a{sv}', {
    target: GLib.Variant.new_uint16(settings.target),
    customApp: GLib.Variant.new_string(settings.customApp),
    inverted: GLib.Variant.new_boolean(settings.inverted),
    min: GLib.Variant.new_uint16(settings.min),
    max: GLib.Variant.new_uint16(settings.max)
  });
}
