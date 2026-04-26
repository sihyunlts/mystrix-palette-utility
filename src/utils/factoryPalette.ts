import { Color } from '../types';
import { parsePaletteFile } from './paletteFile';
import novationRgbPreset from '../presets/Novation_RGB?raw';

export const FACTORY_PALETTE_NAME = 'Novation RGB';

export const FACTORY_PALETTE_COLORS: Color[] = parsePaletteFile(novationRgbPreset);
