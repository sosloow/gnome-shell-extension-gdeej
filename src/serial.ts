import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { settings, state } from './extension.js';
import { settingsKeys, serialDeviceStatuses } from './constants.js';
import { cmdStream, detectSerialDevices } from './utils/os.js';
import { waitForIdle, notify } from './utils/decorators.js';

type serialDevice = {
  path: string;
  status: serialDeviceStatuses;
};

Gio._promisify(Gio.DataInputStream.prototype, 'close_async');

export default class Serial extends GObject.Object {
  static OUTPUT_BUFFER_LIMIT = 10;
  static RECONNECT_TIMEOUT_SECONDS = 1;
  static CONNECTION_CHECK_TIMEOUT = 200;
  static AUTODETECT_PRIORITY = [
    serialDeviceStatuses.ACTIVE,
    serialDeviceStatuses.DISABLED,
    serialDeviceStatuses.UNKNOWN,
    serialDeviceStatuses.ERROR
  ];
  static INPUT_REGEXP = /(\d+\|?)+/;

  enabled: boolean;
  @notify()
  accessor error: string;
  @notify()
  accessor connected: boolean;
  @notify()
  accessor initialConnect: boolean;

  autoReconnect: boolean;
  autoDetect: boolean;
  output?: string;

  #outputBuffer: string[] = [];

  #detectedDevices: serialDevice[] = [];
  _devicePath?: string;

  _deviceStdout?: Gio.DataInputStream;
  _deviceStderr?: Gio.DataInputStream;
  _deviceSubprocess?: Gio.Subprocess;

  _readDeviceLoopCancellable?: Gio.Cancellable;

  _reconnectTimeoutId?: number;
  _settingsHandlerId?: number;

  _bindings: GObject.Binding[] = [];

  constructor() {
    super();

    this.error = null!;
    this.connected = false;
    this.initialConnect = true;
    this.enabled = settings.get_boolean(settingsKeys.SERIAL_ENABLED);
    this.autoReconnect = settings.get_boolean(
      settingsKeys.DEVICE_AUTO_RECONNECT
    );
    this.autoDetect = settings.get_boolean(settingsKeys.DEVICE_AUTO_DETECT);
  }

  _init() {
    super._init();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this._settingsHandlerId = settings.connectObject(
      `changed::${settingsKeys.SERIAL_ENABLED}`,
      () =>
        settings.get_boolean(settingsKeys.SERIAL_ENABLED)
          ? this.enable()
          : this.disable(),
      `changed::${settingsKeys.DEVICE_PATH}`,
      () => this._reconnect(true),
      `changed::${settingsKeys.DEVICE_AUTO_RECONNECT}`,
      () => {
        this.autoReconnect = settings.get_boolean(
          settingsKeys.DEVICE_AUTO_RECONNECT
        );

        if (this.autoReconnect && !this.connected) {
          this._reconnect(true);
        }
      },
      `changed::${settingsKeys.DEVICE_AUTO_DETECT}`,
      () => {
        this.autoDetect = settings.get_boolean(settingsKeys.DEVICE_AUTO_DETECT);

        this._reconnect(true);
      },
      this
    );

    this._bindings = [
      this.bind_property(
        'error',
        state,
        'serialError',
        GObject.BindingFlags.DEFAULT
      ),
      this.bind_property(
        'connected',
        state,
        'serialConnected',
        GObject.BindingFlags.DEFAULT
      ),
      this.bind_property(
        'initialConnect',
        state,
        'serialInitialConnect',
        GObject.BindingFlags.DEFAULT
      )
    ];

    this.enabled = settings.get_boolean(settingsKeys.SERIAL_ENABLED);

    this._reconnect(true).catch((err) => {
      console.warn(err);

      this.#updateDeviceStatus(serialDeviceStatuses.ERROR);
    });
  }

  async destroy() {
    settings.disconnect(this._settingsHandlerId!);

    for (const binding of this._bindings) {
      binding.unbind();
    }

    return this.disable();
  }

  async enable() {
    this.enabled = true;

    return this._reconnect(true);
  }

  async disable() {
    this.enabled = false;

    return this._disconnect();
  }

  async _disconnect() {
    this.connected = false;

    if (this._reconnectTimeoutId) {
      GLib.Source.remove(this._reconnectTimeoutId);
    }

    try {
      this._deviceSubprocess?.force_exit();
    } catch (err) {
      console.debug(err);
    }
    this._deviceSubprocess = null!;

    try {
      this._readDeviceLoopCancellable?.cancel();
      await this._deviceStdout?.close_async(GLib.PRIORITY_DEFAULT, null);
    } catch (err) {
      console.debug(err);
    }
    this._deviceStdout = null!;

    try {
      await this._deviceStderr?.close_async(GLib.PRIORITY_DEFAULT, null);
    } catch (err) {
      console.debug(err);
    }
    this._deviceStderr = null!;
  }

  async #connect() {
    const devicePath = await this.#getDevicePath();

    const { subprocess, stdout, stderr } = await cmdStream(['cat', devicePath]);

    // await this.#checkDevice(stderr);

    this._deviceSubprocess = subprocess;
    this._deviceStdout = stdout;
    this._deviceStderr = stderr;

    this._readDeviceLoop();
  }

  async _reconnect(force = false) {
    await this._disconnect();

    if (!this.enabled || (!force && !this.autoReconnect)) {
      return;
    }

    this._reconnectTimeoutId = GLib.timeout_add_seconds(
      GLib.PRIORITY_LOW,
      Serial.RECONNECT_TIMEOUT_SECONDS,
      () => {
        this._reconnectTimeoutId = null!;

        this.#connect().catch((err) => {
          this.#updateDeviceStatus(serialDeviceStatuses.ERROR);
          console.debug(err);
          this.error = _('Failed to connect');

          this._reconnect();
        });

        return GLib.SOURCE_REMOVE;
      }
    );
  }

  @waitForIdle
  _readDeviceLoop() {
    if (!this._deviceStdout) {
      return this._reconnect();
    }

    this._readDeviceLoopCancellable = new Gio.Cancellable();

    this._deviceStdout.read_line_async(
      GLib.PRIORITY_DEFAULT,
      this._readDeviceLoopCancellable,
      (stream, res) => {
        try {
          if (!stream) {
            throw new Error('Input stream is missing');
          }

          const [line] = stream.read_line_finish_utf8(res);

          if (line === null) {
            throw new Error('Failed to read device');
          }

          if (line) {
            this.#pushToOutput(line);
          }

          if (!this.connected) {
            this.#updateDeviceStatus(serialDeviceStatuses.ACTIVE);
            this.connected = true;
            this.error = null!;
          }

          this._readDeviceLoop();
        } catch (err) {
          if (
            err instanceof Gio.IOErrorEnum &&
            err.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)
          ) {
            this.#updateDeviceStatus(serialDeviceStatuses.DISABLED);

            return;
          }

          this.#updateDeviceStatus(serialDeviceStatuses.ERROR);
          this.error = _('Failed to read device');
          console.debug(err);

          this._reconnect();
        } finally {
          if (this.initialConnect) {
            this.initialConnect = false;
          }
        }
      }
    );
  }

  #pushToOutput(line: string) {
    this.output = line;

    this.#validateInput(line);

    this.#outputBuffer.push(line);

    while (this.#outputBuffer.length > Serial.OUTPUT_BUFFER_LIMIT) {
      this.#outputBuffer.shift();
    }
  }

  #validateInput(line: string) {
    if (!Serial.INPUT_REGEXP.test(line)) {
      throw new Error('Invalid input data');
    }
  }

  async #getDevicePath(): Promise<string> {
    if (!this.autoDetect) {
      this._devicePath = settings.get_string(settingsKeys.DEVICE_PATH);
      return this._devicePath;
    }

    const devicePaths = await detectSerialDevices();

    for (const path of devicePaths) {
      const existingDevice = this.#detectedDevices.find(
        ({ path: existingPath }) => existingPath === path
      );
      if (!existingDevice) {
        this.#detectedDevices.push({
          path,
          status: serialDeviceStatuses.UNKNOWN
        });
      }
    }

    let device: serialDevice | null = null;
    for (const status of Serial.AUTODETECT_PRIORITY) {
      device =
        this.#detectedDevices.find((device) => device.status === status) ??
        null;

      if (device) {
        break;
      }
    }

    if (!device) {
      throw new Error('Autodetect: no serial device detected');
    }

    this._devicePath = device.path;

    return this._devicePath;
  }

  #updateDeviceStatus(status: serialDeviceStatuses) {
    const device = this.#detectedDevices.find(
      ({ path }) => path === this._devicePath
    );
    console.log('bazinga', device, status);
    if (device) {
      device.status = status;
    }
  }
}
GObject.registerClass(
  {
    Properties: {
      error: GObject.ParamSpec.string(
        'error',
        'error',
        'Serial error',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        ''
      ),
      connected: GObject.ParamSpec.boolean(
        'connected',
        'connected',
        'Is serial device connected',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        false
      ),
      initialConnect: GObject.ParamSpec.boolean(
        'initialConnect',
        'initialConnect',
        'Is serial device connected for the first time',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        false
      )
    }
  },
  Serial
);
