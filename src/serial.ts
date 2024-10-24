import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

interface SerialConstructorProps {
  devicePath: string;
}
export default class Serial {
  devicePath: string;

  #decoder: TextDecoder;
  #serialSource?: GLib.Source;
  #serialStream?: Gio.UnixInputStream;
  #serialDevice?: Gio.FileInputStream;

  constructor({ devicePath }: SerialConstructorProps) {
    this.devicePath = devicePath;

    this.#decoder = new TextDecoder();
  }

  enable() {
    try {
      this.#connect();
    } catch (error) {
      console.error(error);
    }
  }

  disable() {
    this.#serialSource?.destroy();
    this.#serialStream?.close(null);
    this.#serialDevice?.close(null);
  }

  destroy() {
    this.disable();
  }

  #connect() {
    const file = Gio.File.new_for_path(this.devicePath);
    this.#serialDevice = file.read(null);

    this.#serialStream = new Gio.UnixInputStream({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fd: this.#serialDevice.get_fd()
    });
    this.#serialSource = this.#serialStream.create_source(null);

    this.#serialSource.set_callback(() => {
      try {
        console.log(this.#readStream());
      } catch (error) {
        console.error(error);

        return GLib.SOURCE_REMOVE;
      }

      return GLib.SOURCE_CONTINUE;
    });

    this.#serialSource.attach(null);
  }

  #readStream() {
    if (!this.#serialStream) {
      throw new Error('Serial device missing');
    }

    const contentsBytes = this.#serialStream.read_bytes(4096, null);
    return this.#decoder.decode(contentsBytes.toArray()).trim();
  }
}
