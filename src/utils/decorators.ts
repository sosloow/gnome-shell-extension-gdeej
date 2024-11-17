/* eslint-disable @typescript-eslint/no-explicit-any */
import GLib from 'gi://GLib';

export function waitForIdle(
  _target: unknown,
  _key: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
      try {
        method.apply(this, args);
      } catch (err) {
        console.warn(err);
      }

      return GLib.SOURCE_REMOVE;
    });
  };

  return descriptor;
}

type NotifyProps = {
  changed?: boolean;
};
export function notify({ changed = false }: NotifyProps = {}) {
  return function (target: any, key: any, descriptor: any) {
    let value: any;

    descriptor.get = function () {
      return value;
    };
    descriptor.set = function (newValue: any) {
      const oldValue = value;

      value = newValue;

      this.notify(key);

      if (changed && oldValue !== value) {
        this.emit(`changed::${key}`);
      }
    };
  };
}
