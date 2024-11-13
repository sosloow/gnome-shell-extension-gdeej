export enum SliderTarget {
  SYSTEM = 0,
  MIC = 1,
  STEAM = 2,
  CUSTOM_APP = 3
}

export type SliderSettings = {
  target: SliderTarget;
  'custom-app': string;
  inverted: boolean;
};
