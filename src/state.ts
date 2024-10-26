/* eslint-disable @typescript-eslint/no-explicit-any */
function gObjectProp(target: any, key: any, descriptor: any) {
  let value: any;

  Object.defineProperty(target, key, {
    ...descriptor,
    get() {
      console.log('bazinga get');
      return value;
    },
    set(newValue: any) {
      value = newValue;
      console.log('bazinga set');
    }
  });

  return target;
}

class State {
  @gObjectProp accessor error: string;
  @gObjectProp accessor connected: boolean;

  constructor() {
    this.error = 'error';
    this.connected = false;
  }

  bazinga() {
    console.log('bazinga!!!');
  }
}

const o = new State();

o.error = 'bazinga';
console.log(o.error);
