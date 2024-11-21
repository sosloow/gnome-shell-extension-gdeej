# GDeej: deej for GNOME Shell

Control your system's audio through physical sliders using a DIY deej mixer. This extension integrates deej hardware with GNOME Shell's volume controls, allowing you to adjust volume levels for different applications using physical controls.

![](/assets/screenshots/quick-settings.png)

## Prerequisites

1. This extension requires a hardware deej volume mixer connected to your PC via USB. You'll need to build the hardware component first - see the [original deej project](https://github.com/omriharel/deej) for instructions.
2. This extension runs `socat` in background to read from your deej. Install it
   from your distribution's repository
   - For Ubuntu/Debian:
     ```bash
     sudo apt install -y socat
     ```
   - For Fedora:
     ```bash
     sudo dnf install -y socat
     ```
   - For Arch Linux:
     ```bash
     sudo pacman -S socat
     ```
3. Your user must have permission to access serial devices. Add your user to the `dialout` group:
   ```bash
   sudo usermod -aG dialout $USER
   ```
   **Note**: You'll need to log out and back in for this change to take effect.

## How to install

### Install from extensions.gnome.org (Recommended)

[<img src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true" alt="Get it on GNOME Extensions" height="100" align="middle">][ego]

### Manual installation

1. Download the latest release from the releases tab
2. Extract the archive
3. Run the following commands:

   ```bash
   # Install the extension
   gnome-extensions install gdeej@kareraisu.me.zip --force

   # Enable the extension (after connecting your deej)
   gnome-extensions enable gdeej@kareraisu.me
   ```

## What is deej?

[deej](https://github.com/omriharel/deej) is an open-source project for building DIY volume mixers using Arduino-compatible boards and some sliders/potentiometers. This extension reimplements the desktop software portion of deej specifically for GNOME Shell, written entirely in JavaScript.

## Features

- Integration with GNOME Shell's Quick Settings menu
- GUI settings! Edit settings in GNOME's extension preferences
- Automatic detection and connection to a deej device
- Auto-reconnect
- Configurable per-slider settings:
  - Min/max values
  - Invert sliders
  - Select an application as a slider target
- Steam as a single slider target. Maps any games/apps that are launched under Steam to a single slider

## Screenshots

### General Preferences

![](/assets/screenshots/prefs-general.png)

### Slider Settings

![](/assets/screenshots/prefs-sliders.png)

## Important Considerations

### Performance

Since this extension runs within GNOME Shell, it shares resources with your desktop environment. And it might affect desktop performance due to IO from the device overwhelming the GJS process. It also might be a mishap on the part of the extension.

If you experience any stutters, freezes or high CPU usage by the `gnome-shell` process after enabling this extension, consider

- lowering the number of updates from your deej device (to 10-15 from the default 100. I haven't benchmarked for precise numbers, but that's the config I use personally)
- creating an issue on GitHub, if you think stutters/freezes are a result of a bug

### Steam Slider Target

I think, it's a neat hack, but you might consider it too sketchy. It's only enabled, if there's a slider with Steam as a target.

It works by running the following command for each audio source:

```bash
ps -u $USER -o command | grep -i 'steam.*${streamName}' | grep -v grep | wc -l
```

## Reporting Issues

Before creating an issue, please include:

- Extension version, GNOME Shell version and your Linux distribution
- Any helpful info related to how your deej device connects and communicates via serial, if the issue is related to detecting/reading the device
- Relevant logs from `journalctl -f -o cat /usr/bin/gnome-shell`, if the issue is with the extension itself
- Relevant logs from `journalctl -f -o cat /usr/bin/gjs`, if the issue is with preferences

## Contributing

As the original deej, it's a community driven open-source project and any help is welcome 🙃

- Report bugs or request features through GitHub issues
- Submit pull requests for improvements or fixes
- Help with testing on different GNOME versions and hardware configurations

## TODO

- [ ] Add localization support

## Credits and Licenses

This project was inspired and uses code patterns from these awesome projects:

- [deej](https://github.com/omriharel/deej)
- [GSConnect](https://github.com/GSConnect/gnome-shell-extension-gsconnect)
- [Vitals](https://github.com/corecoding/Vitals)
- [Caffeine](https://github.com/eonpatapon/gnome-shell-extension-caffeine)
- [Chronomix](https://github.com/zagortenay333/cronomix)
- [Media controls](https://github.com/sakithb/media-controls/)

This project incorporates the following code from other authors:

- **app-chooser.ts**: derived from [sakithb/media-controls](https://github.com/sakithb/media-controls) by Marcus Heine, used under the MIT License. The modified version is available in `src/widgets/app-chooser.ts`.

[ego]: https://extensions.gnome.org/extension/7556/gdeej/
