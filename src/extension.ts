import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
  Extension,
  gettext as _
} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

import Serial from './serial.js';
import VolumeControl from './volume-control.js';
import State from './utils/state.js';
import { getIcon } from './utils/misc.js';

import { settingsKeys } from './constants.js';

class DeejToggle extends QuickSettings.QuickMenuToggle {
  _errorHandlerId?: number;
  _connectedHandlerId?: number;

  _init() {
    super._init({
      title: _('Deej'),
      toggleMode: true
    });
    this.gicon = getIcon(extension.path, 'deej-logo-symbolic');

    settings.bind(
      settingsKeys.SERIAL_ENABLED,
      this,
      'checked',
      Gio.SettingsBindFlags.DEFAULT
    );

    this._errorHandlerId = state.connect('notify::serialError', () => {
      if (state.serialError) {
        this._updateHeader(state.serialError);
      }
    });
    this._connectedHandlerId = state.connect('notify::serialConnected', () => {
      if (state.serialConnected) {
        this._updateHeader(_('Connected'));
      } else if (!state.serialError) {
        this._updateHeader(_('Disconnected'));
      }
    });

    this._updateHeader();

    this.menu.addAction(_('Settings'), () => extension.openPreferences());
  }

  _updateHeader(subtitle?: string) {
    this.menu.setHeader(this.gicon, _('Deej'), subtitle);
  }

  destroy() {
    state.disconnect(this._errorHandlerId!);
    state.disconnect(this._connectedHandlerId!);
    this._errorHandlerId = null!;

    super.destroy();
  }
}
GObject.registerClass(DeejToggle);

class DeejIndicator extends QuickSettings.SystemIndicator {
  _toggle?: DeejToggle;
  _volumeControl?: VolumeControl;

  _init() {
    super._init();

    this._toggle = new DeejToggle();
    this._volumeControl = new VolumeControl();
    this.quickSettingsItems.push(this._toggle);
  }

  destroy() {
    this.quickSettingsItems.forEach((item) => item.destroy());
    this._volumeControl?.destroy();

    super.destroy();
  }
}
GObject.registerClass(DeejIndicator);

export class Deej {
  _indicator?: DeejIndicator;
  _notificationHandlerId?: number;
  _icon?: Gio.Icon;

  init() {
    this._indicator = new DeejIndicator();
    this._icon = getIcon(extension.path, 'deej-logo-symbolic');

    // @ts-expect-error addExternalIndicator exists
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);

    this._notificationHandlerId = state.connect(
      'changed::serialConnected',
      () => {
        if (
          !settings.get_boolean(settingsKeys.SERIAL_ENABLED) ||
          state.serialInitialConnect
        ) {
          return;
        }

        this._sendOSDNotification(
          state.serialConnected ? _('Deej connected') : _('Deej disconnected')
        );
      }
    );
  }

  _sendOSDNotification(message: string) {
    Main.osdWindowManager.show(-1, this._icon, message, null, null);
  }

  destroy() {
    this._indicator?.destroy();
    this._indicator = null!;
    this._icon = null!;

    state.disconnect(this._notificationHandlerId!);
    this._notificationHandlerId = null!;
  }
}

export let extension: DeejExtension;
export let settings: Gio.Settings;
export let state: State;
export let serial: Serial;
export default class DeejExtension extends Extension {
  deej?: Deej;

  enable() {
    extension = this!;
    settings = this.getSettings();
    state = new State();
    serial = new Serial();

    this.deej = new Deej();
    this.deej.init();
  }
  disable() {
    this.deej?.destroy();
    this.deej = null!;

    serial.destroy();
    serial = null!;

    state = null!;

    extension = null!;
    settings = null!;
  }
}
