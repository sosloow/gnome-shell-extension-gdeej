import Gvc from 'gi://Gvc';
import GObject from 'gi://GObject';
// import { gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { settings, serial } from './extension.js';
import { SliderTarget, SliderSettings } from './widgets/types.js';
import { isSteamGame } from './utils/os.js';

import { settingsKeys } from './constants.js';

interface Slider extends SliderSettings {
  value: number;
  level: number;
  streams: Set<Gvc.MixerStream>;
}

export default class VolumeControl extends GObject.Object {
  static delimeter = '|';

  private _control = new Gvc.MixerControl({
    name: 'Deej Volume Control'
  });
  private _streams: Map<string, Set<Gvc.MixerStream>> = new Map();
  private _sliders: Slider[] = [];
  private _settingsHandlerId: number;

  constructor() {
    super();

    this._initSliders();
    this._initGvc();

    serial.addListener(this._onData.bind(this));

    // @ts-expect-error connectObject
    this._settingsHandlerId = settings.connectObject(
      `changed::${settingsKeys.SLIDERS}`,
      () => this._initSliders()
    );
  }

  destroy() {
    this._control.close();
    this._streams.clear();

    for (const slider of this._sliders) {
      slider.streams.clear();
    }

    this._control = null!;

    settings.disconnect(this._settingsHandlerId);
  }

  _onData(data: string) {
    const values = data.split(VolumeControl.delimeter);

    for (let i = 0; i < values.length; i++) {
      const value = Number(values[i]);
      const slider = this._sliders[i];

      if (Number.isNaN(value) || !slider || slider.value === value) {
        continue;
      }

      slider.value = value;
      slider.level = getSliderLevel(slider, value);

      this.setVolume(slider, slider.level);
    }
  }

  setVolume(slider: Slider, volume: number) {
    volume = Math.max(0, Math.min(100, volume));

    const paVolume = Math.floor(
      (volume / 100) * this._control.get_vol_max_norm()
    );

    for (const stream of slider.streams) {
      stream.set_volume(paVolume);
      stream.push_volume();
    }
  }

  private _initGvc() {
    this._control.connect('stream-added', (_, id: number) => {
      const stream = this._control.lookup_stream_id(id);
      if (!stream) return;

      if (stream.is_event_stream) return;

      this._addStream(stream.get_name(), stream);
    });

    this._control.connect('stream-removed', (_, id: number) => {
      const stream = this._control.lookup_stream_id(id);
      if (!stream) return;

      this._removeStream(stream.get_name());
    });
    this._control.connect('default-sink-changed', () => {
      this._setSliderStream(
        SliderTarget.SYSTEM,
        this._control.get_default_sink()
      );
    });
    this._control.connect('default-source-changed', () => {
      this._setSliderStream(
        SliderTarget.MIC,
        this._control.get_default_source()
      );
    });

    this._control.open();
  }

  private _setSliderStream(target: SliderTarget, stream: Gvc.MixerStream) {
    const slider = this._sliders.find((slider) => slider.target === target);

    if (!slider) return;

    slider.streams.clear();
    slider.streams.add(stream);
  }

  private _addStream(name: string, stream: Gvc.MixerStream) {
    if (!name) return;

    let streams = this._streams.get(name);
    if (!streams) {
      streams = new Set();
      this._streams.set(name, streams);
    }
    streams.add(stream);

    for (const slider of this._sliders) {
      if (
        slider.target === SliderTarget.CUSTOM_APP &&
        name.toLowerCase().includes(slider.customApp.toLowerCase())
      ) {
        slider.streams.add(stream);
      }
    }

    const steamSlider = this._sliders.find(
      (slider) => slider.target === SliderTarget.STEAM
    );
    if (steamSlider) {
      isSteamGame(name)
        .then((isSteamGame) => {
          if (isSteamGame) steamSlider.streams.add(stream);
        })
        .catch(console.warn);
    }
  }

  private _removeStream(name: string) {
    if (!name) return;

    const streams = this._streams.get(name);

    if (!streams) return;

    for (const stream of streams) {
      for (const slider of this._sliders) {
        slider.streams.delete(stream);
      }
    }
  }

  private _initSliders() {
    const sliders = settings
      .get_value('sliders')
      .recursiveUnpack() as SliderSettings[];

    const oldSliders = this._sliders;

    this._sliders = sliders.map((slider) => {
      const oldSlider = oldSliders.find(
        (oldSlider) =>
          oldSlider.target === slider.target &&
          (oldSlider.target !== SliderTarget.CUSTOM_APP ||
            oldSlider.customApp === slider.customApp)
      );

      const streams = oldSlider
        ? new Set(oldSlider.streams)
        : this._getStreamsByTarget(slider.target, slider.customApp);

      return {
        ...slider,
        level: oldSlider?.level ?? 0,
        value: oldSlider?.value ?? 0,
        streams
      };
    });

    for (const slider of oldSliders) {
      slider.streams.clear();
    }
  }

  private _getStreamsByTarget(
    target: SliderTarget,
    appName: string
  ): Set<Gvc.MixerStream> {
    switch (target) {
      case SliderTarget.SYSTEM:
        return new Set([this._control.get_default_sink()]);
      case SliderTarget.MIC:
        return new Set([this._control.get_default_source()]);
      case SliderTarget.CUSTOM_APP:
        return this._getStreamsByAppName(appName);
      default:
        return new Set();
    }
  }

  private _getStreamsByAppName(appName: string): Set<Gvc.MixerStream> {
    const result: Set<Gvc.MixerStream> = new Set();

    for (const [name, streams] of this._streams.entries()) {
      if (!name.toLowerCase().includes(appName)) continue;

      for (const stream of streams) {
        result.add(stream);
      }
    }

    return result;
  }
}
GObject.registerClass(VolumeControl);

function getSliderLevel(slider: Slider, value: number) {
  if (slider.inverted) {
    value = Math.abs(value - slider.max);
  }

  value = Math.max(value - slider.min, 0);
  value = Math.min(value, slider.max);

  return Math.round((value / Math.abs(slider.max - slider.min)) * 100);
}
