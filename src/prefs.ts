// import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import {
  ExtensionPreferences,
  gettext as _
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import { settingsKeys } from './constants.js';

export default class GnomeRectanglePreferences extends ExtensionPreferences {
  _settings?: Gio.Settings;

  async fillPreferencesWindow(window: Adw.PreferencesWindow) {
    this._settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      title: _('General'),
      iconName: 'dialog-information-symbolic'
    });

    const deviceGroup = new Adw.PreferencesGroup({
      title: _('Serial device'),
      description: _('Configure path to serial device')
    });
    page.add(deviceGroup);

    const autoDetectEnabled = new Adw.SwitchRow({
      title: _('Auto-detect'),
      subtitle: _('Automatically detect Deej serial device')
    });
    deviceGroup.add(autoDetectEnabled);

    const devicePath = new Adw.EntryRow({
      title: _('Device path')
      // subtitle: _('Path to Deej serial device'),
    });
    deviceGroup.add(devicePath);

    window.add(page);

    this._settings!.bind(
      settingsKeys.DEVICE_AUTO_DETECT,
      autoDetectEnabled,
      'active',
      Gio.SettingsBindFlags.DEFAULT
    );
    this._settings!.bind(
      settingsKeys.DEVICE_PATH,
      devicePath,
      'value',
      Gio.SettingsBindFlags.DEFAULT
    );

    Gio.Subprocess.new([`${this.path}/deej-preferences`], 0);
  }
}
