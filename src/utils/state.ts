import GObject from 'gi://GObject';

export default class GDeejState extends GObject.Object {
  _serialError: string;
  _serialConnected: boolean;
  serialInitialConnect: boolean;

  constructor() {
    super();

    this._serialError = null!;
    this._serialConnected = false;
    this.serialInitialConnect = true;
  }

  get serialError(): string {
    return this._serialError;
  }

  set serialError(value: string) {
    this._serialError = value;

    this.notify('serialError');
  }

  get serialConnected(): boolean {
    return this._serialConnected;
  }

  set serialConnected(value: boolean) {
    const oldValue = this._serialConnected;
    this._serialConnected = value;

    this.notify('serialConnected');

    if (oldValue !== value) {
      this.emit('changed::serialConnected');
    }
  }
}
GObject.registerClass(
  {
    Properties: {
      serialError: GObject.ParamSpec.string(
        'serialError',
        'serialError',
        'Extension error',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        ''
      ),
      serialConnected: GObject.ParamSpec.boolean(
        'serialConnected',
        'serialConnected',
        'Is serial device connected',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        false
      ),
      serialInitialConnect: GObject.ParamSpec.boolean(
        'serialInitialConnect',
        'serialInitialConnect',
        'Is serial device connected',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        false
      )
    },
    Signals: {
      changed: {
        flags: GObject.SignalFlags.RUN_LAST | GObject.SignalFlags.DETAILED
      }
    }
  },
  GDeejState
);
