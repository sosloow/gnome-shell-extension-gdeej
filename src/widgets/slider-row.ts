import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { SliderSettings, SliderTarget } from './types.js';
import { sliderToVariant } from './helpers.js';

interface SliderRowConstructorProps
  extends Adw.PreferencesRow.ConstructorProps {
  sliderIndex?: number;
}
export default class DeejSliderRow extends Adw.PreferencesRow {
  private _switchInvert: Gtk.Switch;
  private _removeButton: Gtk.Button;
  private _dropdownTarget: Gtk.DropDown;
  private _dropdownOptions: Gtk.StringList;

  sliderIndex: number;

  constructor(params: Partial<SliderRowConstructorProps> = {}) {
    super(params);

    this.sliderIndex = -1;

    this.sliderIndex = params.sliderIndex!;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._switchInvert = this._switch_invert;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._removeButton = this._btn_remove;
    // @ts-expect-error Typescript doesn't know about the internal children
    this._dropdownTarget = this._dropdown_target;
    // @ts-expect-error Typescript doesn't know about the internal children
    const labelTitle = this._label_title as Gtk.Label;

    labelTitle.label = _('Slider') + ' ' + (this.sliderIndex + 1);

    this._dropdownOptions = new Gtk.StringList();

    this._dropdownTarget.set_model(this._dropdownOptions);

    const defaultSliderTargets = {
      MASTER: _('Master'),
      MIC: _('Microphone'),
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
    this._removeButton.connect('clicked', () => {
      this.emit('removed');
    });
  }

  set sliderConfig(config: GLib.Variant | null) {
    if (config === null) {
      return;
    }

    const unpacked = config.recursiveUnpack() as SliderSettings;

    this._dropdownTarget.set_selected(unpacked.target);
    this._switchInvert.set_active(unpacked.inverted ?? false);
  }

  get sliderConfig() {
    return sliderToVariant({
      target: this._dropdownTarget.get_selected(),
      'custom-app': '',
      inverted: this._switchInvert.get_active()
    });
  }

  _onConfigChanged() {
    this.emit('config-changed', this.sliderConfig);
  }
}
