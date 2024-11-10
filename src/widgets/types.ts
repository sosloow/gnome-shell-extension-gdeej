export enum SliderTarget {
  MASTER = 0,
  MIC = 1,
  CUSTOM_APP = 2
}

export type SliderSettings = {
  target: SliderTarget;
  'custom-app': string;
  inverted: boolean;
};
