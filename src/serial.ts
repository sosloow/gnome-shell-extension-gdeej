import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { settings, state } from './extension.js';
import { settingsKeys, serialDeviceStatuses } from './constants.js';
import { serialStream, detectSerialDevices } from './utils/os.js';
import { waitForIdle, notify } from './utils/decorators.js';

type serialDevice = {
  path: string;
  status: serialDeviceStatuses;
};

type SerialListener = (data: string[]) => void;

Gio._promisify(Gio.InputStream.prototype, 'close_async');

export default class Serial extends GObject.Object {
  static OUTPUT_BUFFER_LIMIT = 10;
  static RECONNECT_TIMEOUT_SECONDS = 1;
  static CONNECTION_CHECK_TIMEOUT = 200;
  static READ_BYTES_LENGTH = 1024;
  static DELIMITER = '|';
  static AUTODETECT_PRIORITY = [
    serialDeviceStatuses.ACTIVE,
    serialDeviceStatuses.DISABLED,
    serialDeviceStatuses.UNKNOWN,
    serialDeviceStatuses.ERROR
  ];

  enabled: boolean;
  @notify()
  accessor error: string;
  @notify()
  accessor connected: boolean;
  @notify()
  accessor initialConnect: boolean;

  autoReconnect: boolean;
  autoDetect: boolean;
  baudRate: string;
  output?: string[];

  private _outputBuffer: string[][] = [];

  _detectedDevices: serialDevice[] = [];
  _devicePath?: string;

  _deviceStdout?: Gio.DataInputStream;
  _deviceStderr?: Gio.DataInputStream;
  _deviceSubprocess?: Gio.Subprocess;

  _readDeviceLoopCancellable?: Gio.Cancellable;

  _reconnectTimeoutId?: number;
  _settingsHandlerId?: number;

  _bindings: GObject.Binding[] = [];
  _listeners: SerialListener[] = [];

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
    this.baudRate = settings.get_string(settingsKeys.DEVICE_BAUD_RATE);
  }

  _init() {
    super._init();

    // @ts-expect-error connectObject
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
      `changed::${settingsKeys.DEVICE_AUTO_DETECT}`,
      () => {
        this.baudRate = settings.get_string(settingsKeys.DEVICE_BAUD_RATE);

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

      this._updateDeviceStatus(serialDeviceStatuses.ERROR);
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

  async addListener(listener: SerialListener) {
    this._listeners.push(listener);
  }

  async _disconnect() {
    this.connected = false;

    if (this._reconnectTimeoutId) {
      GLib.Source.remove(this._reconnectTimeoutId);
    }

    try {
      this._deviceSubprocess?.force_exit();
    } catch (err) {
      console.warn(err);
    }
    this._deviceSubprocess = null!;

    try {
      this._readDeviceLoopCancellable?.cancel();
      await this._deviceStdout?.close_async(GLib.PRIORITY_DEFAULT, null);
    } catch (err) {
      console.warn(err);
    }
    this._deviceStdout = null!;

    try {
      this._readDeviceLoopCancellable?.cancel();
      await this._deviceStderr?.close_async(GLib.PRIORITY_DEFAULT, null);
    } catch (err) {
      console.warn(err);
    }
    this._deviceStdout = null!;
  }

  async _connect() {
    const devicePath = await this._getDevicePath();

    const { subprocess, stdout, stderr } = serialStream(
      devicePath,
      this.baudRate
    );

    this._deviceSubprocess = subprocess;
    this._deviceStdout = stdout;
    this._deviceStderr = stderr;

    return this._readDeviceLoop();
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

        this._connect().catch((err) => {
          this._updateDeviceStatus(serialDeviceStatuses.ERROR);
          console.warn(err);
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
            throw new Error('Failed to read device');
          }

          const [line] = stream.read_line_finish_utf8(res);

          if (line === null) {
            return this._checkErrors();
          }

          const data = this._parseSerialOutput(line);

          if (data.length) {
            this._pushToOutput(data);
          }

          if (!this.connected) {
            this._updateDeviceStatus(serialDeviceStatuses.ACTIVE);
            this.connected = true;
            this.error = null!;
            settings.set_string(settingsKeys.DEVICE_PATH, this._devicePath!);
          }

          this._readDeviceLoop();
        } catch (err) {
          if (
            err instanceof Gio.IOErrorEnum &&
            err.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)
          ) {
            this._updateDeviceStatus(serialDeviceStatuses.DISABLED);

            return;
          }

          this._updateDeviceStatus(serialDeviceStatuses.ERROR);
          this.error = _('Failed to read device');
          console.warn(err);

          this._reconnect();
        } finally {
          if (this.initialConnect) {
            this.initialConnect = false;
          }
        }
      }
    );
  }

  _pushToOutput(values: string[]) {
    this.output = values;

    this._outputBuffer.push(values);

    while (this._outputBuffer.length > Serial.OUTPUT_BUFFER_LIMIT) {
      this._outputBuffer.shift();
    }

    for (const listener of this._listeners) {
      listener(this.output);
    }
  }

  async _getDevicePath(): Promise<string> {
    if (!this.autoDetect) {
      this._devicePath = settings.get_string(settingsKeys.DEVICE_PATH);
      return this._devicePath;
    }

    const devicePaths = await detectSerialDevices();

    for (const path of devicePaths) {
      const existingDevice = this._detectedDevices.find(
        ({ path: existingPath }) => existingPath === path
      );
      if (!existingDevice) {
        this._detectedDevices.push({
          path,
          status: serialDeviceStatuses.UNKNOWN
        });
      }
    }

    if (
      this._detectedDevices.every(
        (device) => device.status === serialDeviceStatuses.ERROR
      )
    ) {
      for (const device of this._detectedDevices) {
        device.status = serialDeviceStatuses.UNKNOWN;
      }
    }

    let device: serialDevice | null = null;
    for (const status of Serial.AUTODETECT_PRIORITY) {
      device =
        this._detectedDevices.find((device) => device.status === status) ??
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

  _updateDeviceStatus(status: serialDeviceStatuses) {
    const device = this._detectedDevices.find(
      ({ path }) => path === this._devicePath
    );

    if (device) {
      device.status = status;
    }
  }

  private _parseSerialOutput(line: string): string[] {
    return line
      .split(Serial.DELIMITER)
      .filter(Boolean)
      .map((line) => line.trim());
  }

  private _checkErrors() {
    this._deviceStderr?.read_line_async(
      GLib.PRIORITY_DEFAULT,
      null,
      (stream, res) => {
        try {
          if (!stream) {
            throw new Error('Failed to read device');
          }

          const [line] = stream.read_line_finish_utf8(res);

          if (line) {
            throw new Error(line);
          }

          this._readDeviceLoop();
        } catch (err) {
          this._updateDeviceStatus(serialDeviceStatuses.ERROR);
          this.error = _('Failed to read device');
          console.warn(err);

          this._reconnect();
        } finally {
          if (this.initialConnect) {
            this.initialConnect = false;
          }
        }
      }
    );
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
