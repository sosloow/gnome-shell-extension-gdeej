import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { SliderSettings, SliderTarget } from './types.js';
import { sliderToVariant } from './helpers.js';
import { SLIDER_MIN_VALUE, SLIDER_MAX_VALUE } from '../constants.js';
import AppChooser from './app-chooser.js';

interface SliderRowConstructorProps
  extends Adw.PreferencesRow.ConstructorProps {
  sliderIndex?: number;
}
export default class DeejSliderRow extends Adw.PreferencesRow {
  private static readonly DEBOUNCE_TIMEOUT_MS = 1000;

  private _btnAppChooser: Gtk.Button;
  private _entryCustomApp: Gtk.Entry;
  private _appChooser: AppChooser;
  private _switchInvert: Gtk.Switch;
  private _removeButton: Gtk.Button;
  private _dropdownTarget: Gtk.DropDown;
  private _dropdownOptions: Gtk.StringList;
  private _entryMin: Gtk.Entry;
  private _entryMax: Gtk.Entry;

  private _debounceTimeoutId: number | null = null;

  sliderIndex: number;

  constructor(params: Partial<SliderRowConstructorProps> = {}) {
    super(params);

    this.sliderIndex = -1;

    this.sliderIndex = params.sliderIndex!;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._switchInvert = this._switch_invert as Gtk.Switch;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._removeButton = this._btn_remove as Gtk.Button;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._dropdownTarget = this._dropdown_target as Gtk.DropDown;
    // @ts-expect-error Typescript doesn't know about the internal children
    const labelTitle = this._label_title as Gtk.Label;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._entryMin = this._entry_min as Gtk.Entry;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._entryMax = this._entry_max as Gtk.Entry;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._btnAppChooser = this._btn_app_chooser as Gtk.Button;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._entryCustomApp = this._entry_custom_app as Gtk.Entry;

    this._appChooser = new AppChooser();

    labelTitle.label = _('Slider') + ' ' + (this.sliderIndex + 1);

    this._dropdownOptions = new Gtk.StringList();

    this._dropdownTarget.set_model(this._dropdownOptions);

    const defaultSliderTargets = {
      SYSTEM: _('System'),
      MIC: _('Microphone'),
      STEAM: _('Steam'),
      CUSTOM_APP: _('Application')
    };

    let targetKey: keyof typeof SliderTarget;
    for (targetKey in defaultSliderTargets) {
      this._dropdownOptions.append(defaultSliderTargets[targetKey]);
    }

    this._dropdownTarget.connect(
      'notify::selected',
      this._onConfigChanged.bind(this)
    );
    this._switchInvert.connect(
      'notify::active',
      this._onConfigChanged.bind(this)
    );
    const entryMinChangedHandler = this._entryMin.connect('changed', () => {
      const text = this._entryMin.get_text();

      const value = validateNumericEntry(text, SLIDER_MIN_VALUE);

      GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
        try {
          if (String(value) !== text) {
            this._entryMin.block_signal_handler(entryMinChangedHandler);
            this._entryMin.set_text(String(value));
            this._entryMin.unblock_signal_handler(entryMinChangedHandler);
          }

          this._onConfigChanged();
        } catch (err) {
          console.warn(err);
        }

        return GLib.SOURCE_REMOVE;
      });
    });
    const entryMaxChangedHandler = this._entryMax.connect('changed', () => {
      const text = this._entryMax.get_text();

      const value = validateNumericEntry(text, SLIDER_MIN_VALUE);

      GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
        try {
          if (String(value) !== text) {
            this._entryMax.block_signal_handler(entryMaxChangedHandler);
            this._entryMax.set_text(String(value));
            this._entryMax.unblock_signal_handler(entryMaxChangedHandler);
          }

          this._onConfigChanged();
        } catch (err) {
          console.warn(err);
        }

        return GLib.SOURCE_REMOVE;
      });
    });
    this._entryCustomApp.connect('changed', () => {
      this._onConfigChanged();
    });

    this._removeButton.connect('clicked', () => {
      this.emit('removed');
    });
    this._btnAppChooser.connect('clicked', async () => {
      const appId = await this._appChooser.showChooser().catch(console.warn);
      if (appId == null) return;

      this._entryCustomApp.text = appId;
    });
  }

  set sliderConfig(config: GLib.Variant | null) {
    if (config === null) {
      return;
    }

    const unpacked = config.recursiveUnpack() as SliderSettings;

    this._dropdownTarget.set_selected(unpacked.target);
    this._switchInvert.set_active(unpacked.inverted ?? false);
    this._entryMin.set_text(String(unpacked.min));
    this._entryMax.set_text(String(unpacked.max));
    this._entryCustomApp.text = unpacked.customApp;

    this._updateView();
  }

  get sliderConfig() {
    return sliderToVariant({
      target: this._dropdownTarget.get_selected(),
      customApp: this._entryCustomApp.get_text(),
      inverted: this._switchInvert.get_active(),
      min: Number(this._entryMin.get_text()) || SLIDER_MIN_VALUE,
      max: Number(this._entryMax.get_text()) || SLIDER_MAX_VALUE
    });
  }

  _onConfigChanged() {
    this._updateView();

    if (this._debounceTimeoutId !== null) {
      GLib.source_remove(this._debounceTimeoutId);

      this._debounceTimeoutId = null;
    }

    this._debounceTimeoutId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      DeejSliderRow.DEBOUNCE_TIMEOUT_MS,
      () => {
        this._debounceTimeoutId = null;

        this.emit('config-changed', this.sliderConfig);

        return GLib.SOURCE_REMOVE;
      }
    );
  }

  private _updateView() {
    if (this._dropdownTarget.get_selected() === SliderTarget.CUSTOM_APP) {
      this._entryCustomApp.get_parent()!.get_parent()!.visible = true;
    } else {
      this._entryCustomApp.get_parent()!.get_parent()!.visible = false;
    }
  }

  destroy(): void {
    if (this._debounceTimeoutId) {
      GLib.source_remove(this._debounceTimeoutId);
    }
  }
}

function validateNumericEntry(text: string, defaultValue: number) {
  const filtered = text.replace(/\D+/g, '');

  const value = parseInt(filtered);
  if (isNaN(value)) {
    return defaultValue;
  }

  return value < SLIDER_MIN_VALUE
    ? SLIDER_MIN_VALUE
    : value > SLIDER_MAX_VALUE
      ? SLIDER_MAX_VALUE
      : value;
}
