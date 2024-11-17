import GObject from 'gi://GObject';

import { notify } from './decorators.js';

export default class GDeejState extends GObject.Object {
  @notify()
  accessor serialError: string;
  @notify({ changed: true })
  accessor serialConnected: boolean;
  serialInitialConnect: boolean;

  constructor() {
    super();

    this.serialError = null!;
    this.serialConnected = false;
    this.serialInitialConnect = true;
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
