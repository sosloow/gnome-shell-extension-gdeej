import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import FilePickerRowOrig from './widgets/file-picker-row.js';
import SliderRowOrig from './widgets/slider-row.js';

import { SliderTarget } from './widgets/types.js';
import { sliderToVariant } from './widgets/helpers.js';
import { settingsKeys } from './constants.js';

let FilePickerRow: typeof FilePickerRowOrig;
let SliderRow: typeof SliderRowOrig;

export default class GnomeRectanglePreferences extends ExtensionPreferences {
  private _settings?: Gio.Settings;
  private _builder?: Gtk.Builder;
  private _generalPage?: Adw.PreferencesPage;
  private _slidersPage?: Adw.PreferencesPage;
  private _listBoxSliders?: Gtk.ListBox;

  // @ts-expect-error method is expected to return promise for some reason
  fillPreferencesWindow(window: Adw.PreferencesWindow) {
    const resourcePath = GLib.build_filenamev([this.path, 'deej.gresource']);
    Gio.resources_register(Gio.resource_load(resourcePath));

    this._settings = this.getSettings();

    if (!FilePickerRow) {
      FilePickerRow = GObject.registerClass(
        {
          GTypeName: 'DeejFilePickerRow',
          Template:
            'resource:///org/gnome/shell/extensions/deej/ui/file-picker-row.ui',
          InternalChildren: ['file-button']
        },
        FilePickerRowOrig
      );
    }

    if (!SliderRow) {
      SliderRow = GObject.registerClass(
        {
          GTypeName: 'DeejSliderRow',
          Template:
            'resource:///org/gnome/shell/extensions/deej/ui/slider-row.ui',
          Properties: {
            'slider-config': GObject.param_spec_variant(
              'slider-config',
              'Slider Configuration',
              'Configuration for this slider',
              new GLib.VariantType('a{sv}'),
              null,
              GObject.ParamFlags.READWRITE
            ),
            'slider-index': GObject.ParamSpec.int(
              'slider-index',
              'Slider Index',
              'Index of this slider in the array',
              GObject.ParamFlags.READWRITE,
              -1,
              100,
              -1
            )
          },

          InternalChildren: [
            'entry-custom-app',
            'switch-invert',
            'btn-remove',
            'dropdown-target',
            'label-title'
          ],

          Signals: {
            removed: {},
            'config-changed': {
              param_types: [GLib.Variant.$gtype]
            }
          }
        },
        SliderRowOrig
      );
    }

    this._builder = Gtk.Builder.new_from_resource(
      '/org/gnome/shell/extensions/deej/ui/prefs.ui'
    );

    this._generalPage = this._builder.get_object('page-general');
    this._slidersPage = this._builder.get_object('page-sliders');

    this._fillSlidersPage();
    this._bindSettings();

    window.add(this._generalPage);
    window.add(this._slidersPage);
  }

  private _fillSlidersPage() {
    const addButton = this._builder!.get_object('btn-add-slider');

    this._listBoxSliders = this._builder!.get_object('list-box-sliders');

    addButton.connect('clicked', () => {
      const sliders = this._getSliders();

      sliders.push(
        sliderToVariant({
          target: SliderTarget.SYSTEM,
          'custom-app': '',
          inverted: false
        })
      );
      this._saveSliders(sliders);
      this.refreshSliderList();
    });

    this.refreshSliderList();
  }

  private _getSliders() {
    return this._settings!.get_value('sliders').unpack() as GLib.Variant[];
  }

  private _saveSliders(sliders: GLib.Variant[]) {
    const variantArray = GLib.Variant.new_array(
      GLib.VariantType.new('a{sv}'),
      sliders
    );

    this._settings!.set_value('sliders', variantArray);
  }

  private refreshSliderList() {
    let slider = this._listBoxSliders!.get_first_child() as SliderRowOrig;

    while (slider) {
      this._listBoxSliders!.remove(slider);

      slider = this._listBoxSliders!.get_first_child() as SliderRowOrig;
    }

    const sliders = this._getSliders();

    sliders.forEach((slider, index) => {
      const row = new SliderRow({
        sliderIndex: index
      });
      row.sliderConfig = slider;

      row.connect('config-changed', (row, config) => {
        const sliders = this._settings!.get_value(
          'sliders'
        ).unpack() as GLib.Variant[];
        sliders[index] = config;

        this._saveSliders(sliders);
      });

      row.connect('removed', () => {
        const sliders = this._getSliders();
        sliders.splice(index, 1);
        this._saveSliders(sliders);
        this.refreshSliderList();
      });

      this._listBoxSliders!.append(row);
    });
  }

  private _bindSettings() {
    this._bindSetting(
      settingsKeys.DEVICE_AUTO_RECONNECT,
      'switch-auto-reconnect',
      'active'
    );
    this._bindSetting(
      settingsKeys.DEVICE_AUTO_DETECT,
      'switch-auto-detect',
      'active'
    );
    this._bindSetting(
      settingsKeys.DEVICE_AUTO_DETECT,
      'entry-device-path',
      'visible',
      Gio.SettingsBindFlags.INVERT_BOOLEAN
    );
    this._bindSetting(settingsKeys.DEVICE_PATH, 'entry-device-path', 'text');
  }

  private _bindSetting(
    key: string,
    widgetName: string,
    property: string,
    bindingFlags = Gio.SettingsBindFlags.DEFAULT |
      Gio.SettingsBindFlags.NO_SENSITIVITY
  ) {
    if (!this._settings || !this._builder) {
      return;
    }

    if (property === 'selected') {
      const widget = this._builder.get_object(widgetName) as Adw.ComboRow;
      widget[property] = this._settings.get_enum(key);

      widget.connect(`notify::${property}`, () => {
        this._settings!.set_enum(key, widget[property]);
      });

      this._settings!.connect(`changed::${key}`, () => {
        widget[property] = this._settings!.get_enum(key);
      });
    } else if (property === 'accelerator') {
      const widget = this._builder.get_object(widgetName) as Gtk.ShortcutLabel;
      widget[property] = this._settings.get_strv(key)[0];

      widget.connect(`notify::${property}`, () => {
        this._settings!.set_strv(key, [widget[property]]);
      });

      this._settings.connect(`changed::${key}`, () => {
        widget[property] = this._settings!.get_strv(key)[0];
      });
    } else {
      const widget = this._builder.get_object(widgetName) as Gtk.Widget;
      // @ts-expect-error setting arbitrary props
      widget[property] = this._settings.get_value(key).recursiveUnpack();

      this._settings.bind(key, widget, property, bindingFlags);
    }
  }
}
