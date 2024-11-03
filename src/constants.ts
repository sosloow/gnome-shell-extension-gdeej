export const settingsKeys = {
  SERIAL_ENABLED: 'serial-enabled',
  DEVICE_PATH: 'device-path',
  DEVICE_AUTO_DETECT: 'device-auto-detect',
  DEVICE_AUTO_RECONNECT: 'device-auto-reconnect'
};

export const stateKeys = {
  SERIAL_CONNECTED: 'serial-connected',
  SERIAL_ERROR: 'serial-error'
};

export const osPaths = {
  SERIAL_DIRECTORY: '/dev/serial/by-id'
};

export enum serialDeviceStatuses {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  UNKNOWN = 'unknown',
  ERROR = 'error'
}
