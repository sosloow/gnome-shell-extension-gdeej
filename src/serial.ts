import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { settings, state } from './extension.js';
import { settingsKeys } from './constants.js';
import { cmdStream } from './utils/os.js';
import { waitForIdle, notify } from './utils/decorators.js';

Gio._promisify(Gio.DataInputStream.prototype, 'close_async');

export default class Serial extends GObject.Object {
  static OUTPUT_BUFFER_LIMIT = 10;
  static RECONNECT_TIMEOUT_SECONDS = 1;
  static CONNECTION_CHECK_TIMEOUT = 200;

  enabled: boolean;
  @notify()
  accessor error: string = null!;
  @notify({ initial: false })
  accessor connected: boolean = false;

  autoReconnect?: boolean = true;
  output?: string;

  #outputBuffer: string[] = [];

  _deviceStdout?: Gio.DataInputStream;
  _deviceStderr?: Gio.DataInputStream;
  _deviceSubprocess?: Gio.Subprocess;

  _readDeviceLoopCancellable?: Gio.Cancellable;

  _reconnectTimeoutId?: number;
  _settingsHandlerId?: number;

  _bindings: GObject.Binding[] = [];

  constructor() {
    super();

    this.enabled = settings.get_boolean(settingsKeys.SERIAL_ENABLED);
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
      )
    ];

    this.enabled = settings.get_boolean(settingsKeys.SERIAL_ENABLED);

    this._reconnect(true).catch((err) => console.warn(err));
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
    const { subprocess, stdout, stderr } = await cmdStream([
      'cat',
      settings.get_string(settingsKeys.DEVICE_PATH)
    ]);

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
            this.connected = true;
            this.error = null!;
          }

          this._readDeviceLoop();
        } catch (err) {
          if (
            err instanceof Gio.IOErrorEnum &&
            err.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED)
          ) {
            return;
          }

          this.error = _('Failed to read device');
          console.debug(err);

          this._reconnect();
        }
      }
    );
  }

  #pushToOutput(line: string) {
    this.output = line;

    this.#outputBuffer.push(line);

    while (this.#outputBuffer.length > Serial.OUTPUT_BUFFER_LIMIT) {
      this.#outputBuffer.shift();
    }
  }
}
GObject.registerClass(
  {
    Properties: {
      error: GObject.ParamSpec.string(
        'error',
        'error',
        'Extension error',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        ''
      ),
      connected: GObject.ParamSpec.boolean(
        'connected',
        'connected',
        'Is serial device connected',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        false
      )
    }
  },
  Serial
);
