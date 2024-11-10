import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { osPaths } from '../constants.js';

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');
Gio._promisify(Gio.File.prototype, 'query_info_async');
Gio._promisify(Gio.File.prototype, 'enumerate_children_async');
Gio._promisify(Gio.FileEnumerator.prototype, 'next_files_async');

export async function cmd(argv: string[]): Promise<string> {
  const subprocess = Gio.Subprocess.new(
    argv,
    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const [stdout, stderr] = await subprocess.communicate_utf8_async(null, null);

  if (stderr) {
    throw new Error(stderr);
  }

  return stdout.trim();
}

type CmdStreamResult = {
  subprocess: Gio.Subprocess;
  stdout: Gio.DataInputStream;
};
export function cmdStream(argv: string[]): CmdStreamResult {
  const subprocess = Gio.Subprocess.new(argv, Gio.SubprocessFlags.STDOUT_PIPE);

  const stdout = new Gio.DataInputStream({
    base_stream: subprocess.get_stdout_pipe()!,
    close_base_stream: true
  });

  return {
    subprocess,
    stdout
  };
}

export function serialStream(devicePath: string): CmdStreamResult {
  if (!GLib.file_test(devicePath, GLib.FileTest.EXISTS)) {
    throw new Error(`Device ${devicePath} does not exist`);
  }

  const file = Gio.File.new_for_path(devicePath);
  const info = file.query_info(
    'access::can-read',
    Gio.FileQueryInfoFlags.NONE,
    null
  );

  if (!info.get_attribute_boolean('access::can-read')) {
    throw new Error(`Device ${devicePath} is not readable`);
  }

  return cmdStream(['cat', devicePath]);
}

export async function detectSerialDevices(): Promise<string[]> {
  if (!GLib.file_test(osPaths.SERIAL_DIRECTORY, GLib.FileTest.EXISTS)) {
    return [];
  }

  const baseDir = Gio.File.new_for_path(osPaths.SERIAL_DIRECTORY);

  const enumerator = (await baseDir.enumerate_children_async(
    'standard::name,standard::type,standard::symlink-target',
    Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS,
    GLib.PRIORITY_DEFAULT,
    null
  )) as unknown as Gio.FileEnumerator;

  const devices: string[] = [];
  while (true) {
    const files = (await enumerator.next_files_async(
      10,
      GLib.PRIORITY_DEFAULT,
      null
    )) as unknown as Gio.FileInfo[];

    if (files.length === 0) break;

    for (const fileInfo of files) {
      const name = fileInfo.get_name();
      const fileType = fileInfo.get_file_type();

      const relativePath =
        fileType === Gio.FileType.SYMBOLIC_LINK
          ? fileInfo.get_symlink_target()
          : name;

      const resolvedFile = baseDir.resolve_relative_path(
        relativePath as string
      );
      devices.push(resolvedFile.get_path() as string);
    }
  }

  return devices;
}
