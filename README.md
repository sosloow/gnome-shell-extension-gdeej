# Deej for GNOME Shell

Control your system's audio through physical sliders using a DIY Deej mixer. This extension integrates Deej hardware with GNOME Shell's volume controls, allowing you to adjust volume levels for different applications using physical controls.

## Prerequisites

1. This extension requires a hardware Deej audio mixer connected to your PC via USB. You'll need to build the hardware component first - see the [original Deej project](https://github.com/omriharel/deej) for instructions.
2. Your user must have permission to access serial devices. Add your user to the `dialout` group:
   ```bash
   sudo usermod -aG dialout $USER
   ```
   **Note**: You'll need to log out and back in for this change to take effect.

## How to install

### Install from extensions.gnome.org (Recommended)

[<img src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true" alt="Get it on GNOME Extensions" height="100" align="middle">][ego]
[ego]: https://extensions.gnome.org/extension/

### Manual installation

1. Download the latest release from the releases tab
2. Extract the archive
3. Run the following commands:

   ```bash
   # Install the extension
   gnome-extensions install deej@kareraisu.me.zip --force

   # Enable the extension (after connecting your Deej)
   gnome-extensions enable deej@kareraisu.me
   ```

## What is Deej?

[Deej](https://github.com/omriharel/deej) is an open-source project for building DIY volume mixers using Arduino-compatible boards and some sliders/potentiometers. This extension reimplements the desktop software portion of Deej specifically for GNOME Shell, written entirely in JavaScript.

## Features

- Integration with GNOME Shell's Quick Settings menu
- GUI Settings! Edit settings in GNOME's extension preferences
- Automatic detection and connection to a Deej device
- Auto-reconnect
- Configurable per-slider settings:
  - Min/max values
  - Invert sliders
  - Select an application as a slider target
- Steam as a single slider target. Maps any games/apps that are launched under Steam to a single slider

## Important Considerations

### Performance

Since this extension runs within GNOME Shell, it shares resources with your desktop environment. And it might affect desktop performance due to IO from the device overwhelming the GJS process. It also might be a mishap on the part of the extension.

If you experience any stutters, freezes or high CPU usage by the `gnome-shell` process after enabling this extension, consider

- lowering the number of updates from your Deej device (to 10-15 from the default 100. I haven't benchmarked for precise numbers, but that's the config I use personally)
- creating an issue on GitHub, if you think stutters/freezes is a result of a bug

### Steam Slider Target

I think, it's a neat hack, but you might consider it too sketchy. It's only enabled, if there's a slider with Steam as a target.

It works by running the following command for each audio source:

```bash
ps -u $USER -o command | grep -i 'steam.*${streamName}' | grep -v grep | wc -l
```

## Reporting Issues

Before creating an issue, please include:

- Extension version, GNOME Shell version and your Linux distribution
- Any helpful info related to how your Deej device connects and communicates via serial, if the issue is related to detecting/reading the device
- Relevant logs from `journalctl -f -o cat /usr/bin/gnome-shell`, if the issue is with the extension itself
- Relevant logs from `journalctl -f -o cat /usr/bin/gjs`, if the issue is with preferences

## Contributing

This extension is in active development and aims to implement the core features of the original Deej desktop application and maybe more. Contributions are welcome!

- Report bugs or request features through GitHub issues
- Submit pull requests for improvements or fixes
- Help with testing on different GNOME versions and hardware configurations

## TODO

- [ ] Add localization support

## License

[Add your chosen license]
