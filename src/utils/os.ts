import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { osPaths } from '../constants.js';

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

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
export async function cmdStream(argv: string[]): Promise<CmdStreamResult> {
  const subprocess = Gio.Subprocess.new(
    argv,
    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
  );

  const stdout = new Gio.DataInputStream({
    base_stream: subprocess.get_stdout_pipe()!,
    close_base_stream: true
  });

  const stderr = new Gio.DataInputStream({
    base_stream: subprocess.get_stderr_pipe()!,
    close_base_stream: true
  });

  return {
    subprocess,
    stdout,
    stderr
  };
}

export function resolvePath(...segments: string[]) {
  const startingPoint = segments[0].startsWith('/')
    ? segments[0]
    : GLib.get_current_dir();

  const fullPath = GLib.build_filenamev([startingPoint, ...segments.slice(1)]);

  const file = Gio.File.new_for_path(fullPath);
  const canonicalPath = file.resolve_relative_path('.').get_path();

  return canonicalPath as string;
}

export async function detectSerialDevices(): Promise<string[]> {
  const resultString = await cmd(['ls', '-l', osPaths.SERIAL_DIRECTORY]);

  return resultString
    .split('\n')
    .slice(1, resultString.length)
    .map((lsEntries) => {
      const parts = lsEntries.split(' ');

      return resolvePath(osPaths.SERIAL_DIRECTORY, parts[parts.length - 1]);
    });
}
