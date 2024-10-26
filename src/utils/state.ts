import GObject from 'gi://GObject';

import { notify } from './decorators.js';

export default class State extends GObject.Object {
  @notify()
  accessor serialError: string = null!;
  @notify({ initial: false })
  accessor serialConnected: boolean = false;
}
GObject.registerClass(
  {
    Properties: {
      error: GObject.ParamSpec.string(
        'serialError',
        'serialError',
        'Extension error',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        ''
      ),
      connected: GObject.ParamSpec.boolean(
        'serialConnected',
        'serialConnected',
        'Is serial device connected',
        GObject.ParamFlags.READWRITE | GObject.ParamFlags.EXPLICIT_NOTIFY,
        false
      )
    }
  },
  State
);
