/* eslint-disable @typescript-eslint/no-explicit-any */
import GLib from 'gi://GLib';

export function waitForIdle(
  _target: unknown,
  _key: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
      method.apply(this, args);

      return GLib.SOURCE_REMOVE;
    });
  };

  return descriptor;
}

export function waitForTimeout(timeoutMs = 1, priority = GLib.PRIORITY_LOW) {
  timeoutMs = Math.round(timeoutMs);

  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const timeoutIdKey = `_${key}TimeoutId`;

    descriptor.value = function (...args: unknown[]) {
      target[timeoutIdKey] = GLib.timeout_add(priority, timeoutMs, () => {
        method.apply(this, args);

        target[timeoutIdKey] = null;
        return GLib.SOURCE_REMOVE;
      });
    };

    return descriptor;
  };
}

type NotifyProps = {
  initial?: boolean;
};
export function notify({ initial = true }: NotifyProps = {}) {
  return function (target: any, key: any, descriptor: any) {
    let value: any;

    descriptor.get = function () {
      return value;
    };
    descriptor.set = function (newValue: any) {
      const oldValue = value;

      value = newValue;

      if (oldValue !== value && (oldValue !== undefined || initial)) {
        this.notify(key);
      }
    };
  };
}
