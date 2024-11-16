export const settingsKeys = {
  SERIAL_ENABLED: 'serial-enabled',
  DEVICE_PATH: 'device-path',
  DEVICE_AUTO_DETECT: 'device-auto-detect',
  DEVICE_AUTO_RECONNECT: 'device-auto-reconnect',
  DEVICE_BAUD_RATE: 'device-baud-rate',
  SLIDERS: 'sliders'
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

export const SLIDER_MIN_VALUE = 0;
export const SLIDER_MAX_VALUE = 1024;

export const DATA_INPUT_STREAM_BUFFER_SIZE = 4096;
