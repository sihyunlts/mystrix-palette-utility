import { Color } from '../../types';

export interface PreviewDisplayColors {
  core: string;
  mid: string;
  edge: string;
}

const gamma = 0.6;
const baseGray = 70;

const applyGamma = (channel: number) => Math.pow(channel / 255, gamma) * 255;

export const getPreviewDisplayColors = (color: Color): PreviewDisplayColors => {
  const toDisplayChannel = (
    channel: number,
    grayWeight: number,
    gammaWeight: number,
    keepChannelRatio = true
  ) => Math.round(Math.min(
    255,
    baseGray * grayWeight * (keepChannelRatio ? (1 - channel / 255) : 1) + applyGamma(channel) * gammaWeight
  ));

  const toRgbString = (mapper: (channel: number) => number) => (
    `rgb(${mapper(color.r)}, ${mapper(color.g)}, ${mapper(color.b)})`
  );

  return {
    core: toRgbString((channel) => toDisplayChannel(channel, 1, 1.1)),
    mid: toRgbString((channel) => toDisplayChannel(channel, 0.65, 0.7)),
    edge: toRgbString((channel) => toDisplayChannel(channel, 0.5, 0.1, false)),
  };
};
