export enum SliderTarget {
  SYSTEM = 0,
  MIC = 1,
  STEAM = 2,
  CUSTOM_APP = 3,
  REGEX = 4
}

export type SliderSettings = {
  target: SliderTarget;
  customApp: string;
  inverted: boolean;
  min: number;
  max: number;
};
