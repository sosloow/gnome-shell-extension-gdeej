import Gio from 'gi://Gio';
// import GLib from 'gi://GLib';

import { osPaths } from '../constants.js';

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

export const cmd = (argv: string[]): Promise<string> => {
  const subprocess = Gio.Subprocess.new(
    argv,
    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return subprocess.communicate_utf8_async(null, null);
};

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

export const detectSerialDevices = async () => {
  let resultString: string;

  try {
    resultString = await cmd(['ls', '-l', osPaths.SERIAL_DIRECTORY]);
  } catch (err) {
    logError(err);

    return [];
  }
};
