import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
  Extension,
  gettext as _
} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
const QuickSettingsMenu = Main.panel.statusArea.quickSettings;

import Serial from './serial.js';
import { getIcon } from './utils.js';

const DEVICE_PATH = '/dev/ttyACM0';

class DeejToggle extends QuickSettings.QuickMenuToggle {
  _init() {
    super._init({
      title: _('Deej'),
      toggleMode: true
    });
    this.gicon = getIcon(ext.path, 'deej-logo-symbolic');
    console.log('deej', this.title);
  }
}
GObject.registerClass(DeejToggle);

class DeejIndicator extends QuickSettings.SystemIndicator {
  _toggle?: DeejToggle;

  _init() {
    super._init();

    this._toggle = new DeejToggle();
    this.quickSettingsItems.push(this._toggle);
  }
}
GObject.registerClass(DeejIndicator);

interface DeejConfig {
  devicePath: string;
}
export class Deej {
  #config: DeejConfig = {
    devicePath: DEVICE_PATH
  };
  _indicator?: DeejIndicator | null;
  serial?: Serial | null;

  constructor() {
    this.serial = new Serial({ devicePath: this.#config.devicePath });
  }

  init() {
    this._indicator = new DeejIndicator();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    QuickSettingsMenu.addExternalIndicator(this._indicator);

    this.serial?.enable();
  }

  destroy() {
    this._indicator?.destroy();
    this._indicator = null;
    this.serial = null;
  }
}

export let ext: Extension;
export default class E extends Extension {
  deej: Deej | null = null;
  enable() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    ext = this;

    this.deej = new Deej();
    this.deej.init();
  }
  disable() {
    this.deej?.destroy();
    this.deej = null;
    ext = null!;
  }
}
