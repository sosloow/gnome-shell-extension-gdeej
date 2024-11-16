import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { osPaths, DATA_INPUT_STREAM_BUFFER_SIZE } from '../constants.js';

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
  stderr: Gio.DataInputStream;
};
export function cmdStream(argv: string[]): CmdStreamResult {
  const subprocess = Gio.Subprocess.new(
    argv,
    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
  );

  const stdout = new Gio.DataInputStream({
    base_stream: subprocess.get_stdout_pipe()!,
    close_base_stream: true,
    buffer_size: DATA_INPUT_STREAM_BUFFER_SIZE
  });
  stdout.set_newline_type(Gio.DataStreamNewlineType.ANY);

  const stderr = new Gio.DataInputStream({
    base_stream: subprocess.get_stderr_pipe()!,
    close_base_stream: true,
    buffer_size: DATA_INPUT_STREAM_BUFFER_SIZE
  });
  stderr.set_newline_type(Gio.DataStreamNewlineType.ANY);

  return {
    subprocess,
    stdout,
    stderr
  };
}

export function serialStream(
  devicePath: string,
  baudRate?: string
): CmdStreamResult {
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

  let outputParams = `${devicePath},raw,echo=0,crnl`;

  if (baudRate) {
    outputParams += `,b${baudRate}`;
  }

  return cmdStream(['socat', '-U', '-', outputParams]);
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

export async function isSteamGame(appName: string) {
  const escapedName = appName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const result = await cmd([
    'sh',
    '-c',
    `ps -u $USER -o command | grep -i 'steam.*${escapedName}' | grep -v grep | wc -l`
  ]);

  return Number(result) > 0;
}

export async function listSocatBaudRates() {
  const result = await cmd(['sh', '-c', 'socat -hh | grep b[1-9]']);

  const lines = result.split('\n');

  const baudRates = [];

  for (const line of lines) {
    const match = line.match(/^\s*b(\d+)/);

    if (match) {
      baudRates.push(match[1]);
    }
  }

  return baudRates.sort((b1, b2) => Number(b1) - Number(b2));
}
