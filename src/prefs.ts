import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {
  ExtensionPreferences
  // gettext as _
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// import FilePickerRow from './widgets/file-picker.js';

// import { settingsKeys } from './constants.js';

export default class GnomeRectanglePreferences extends ExtensionPreferences {
  _settings?: Gio.Settings;
  #builder?: Gtk.Builder;
  #generalPage?: Adw.PreferencesPage;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  fillPreferencesWindow(window: Adw.PreferencesWindow) {
    const resourcePath = GLib.build_filenamev([this.path, 'deej.gresource']);
    Gio.resources_register(Gio.resource_load(resourcePath));

    this._settings = this.getSettings();

    this.#builder = Gtk.Builder.new_from_resource(
      '/org/gnome/shell/extensions/deej/ui/prefs.ui'
    );

    this.#generalPage = this.#builder.get_object(
      'page-general'
    ) as Adw.PreferencesPage;

    window.add(this.#generalPage);

    // this._settings!.bind(
    //   settingsKeys.DEVICE_AUTO_RECONNECT,
    //   autoReconnectSwitch,
    //   'active',
    //   Gio.SettingsBindFlags.DEFAULT
    // );
    // this._settings!.bind(
    //   settingsKeys.DEVICE_AUTO_DETECT,
    //   autoDetectSwitch,
    //   'active',
    //   Gio.SettingsBindFlags.DEFAULT
    // );
    // this._settings!.bind(
    //   settingsKeys.DEVICE_AUTO_DETECT,
    //   devicePathEntry,
    //   'visible',
    //   Gio.SettingsBindFlags.INVERT_BOOLEAN
    // );
    // this._settings!.bind(
    //   settingsKeys.DEVICE_PATH,
    //   devicePathEntry,
    //   'text',
    //   Gio.SettingsBindFlags.DEFAULT
    // );
  }
}
