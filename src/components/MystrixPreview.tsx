import React, { memo } from 'react';
import { Color, Palette } from '../types';
import styles from './MystrixPreview.module.css';

interface PaletteGridProps {
  palette: Palette;
  selectedIndex?: number;
  onColorSelect?: (index: number) => void;
  lightshowColors?: Map<number, Color>;
  isLightshowActive?: boolean;
}

interface PadProps {
  index: number;
  baseColorData: Color;
  offColorData: Color;
  lightshowColorData?: Color | null;
  isSelected: boolean;
  onClick?: (index: number) => void;
  isLightshowActive?: boolean;
}

const gamma = 0.6;
const applyGamma = (c: number) => Math.pow(c / 255, gamma) * 255;
const baseGray = 70;

const getColors = (c: Color, isSelected: boolean) => {
  const r_core = Math.round(Math.min(255, baseGray * (1 - c.r / 255) + applyGamma(c.r) * 1.1));
  const g_core = Math.round(Math.min(255, baseGray * (1 - c.g / 255) + applyGamma(c.g) * 1.1));
  const b_core = Math.round(Math.min(255, baseGray * (1 - c.b / 255) + applyGamma(c.b) * 1.1));
  
  const r_mid = Math.round(Math.min(255, baseGray * 0.7 * (1 - c.r / 255) + applyGamma(c.r) * 0.75));
  const g_mid = Math.round(Math.min(255, baseGray * 0.7 * (1 - c.g / 255) + applyGamma(c.g) * 0.75));
  const b_mid = Math.round(Math.min(255, baseGray * 0.7 * (1 - c.b / 255) + applyGamma(c.b) * 0.75));

  const r_edge = Math.round(Math.min(255, baseGray * 0.6 + applyGamma(c.r) * 0.25));
  const g_edge = Math.round(Math.min(255, baseGray * 0.6 + applyGamma(c.g) * 0.25));
  const b_edge = Math.round(Math.min(255, baseGray * 0.6 + applyGamma(c.b) * 0.25));

  return {
    core: `rgb(${r_core}, ${g_core}, ${b_core})`,
    mid: `rgb(${r_mid}, ${g_mid}, ${b_mid})`,
    edge: `rgb(${r_edge}, ${g_edge}, ${b_edge})`,
    glow: `rgba(${c.r}, ${c.g}, ${c.b}, ${isSelected ? 0.9 : 0.6})`
  };
};

const Pad = memo(({ 
  index, 
  baseColorData, 
  offColorData, 
  lightshowColorData, 
  isSelected, 
  onClick, 
  isLightshowActive 
}: PadProps) => {
  const intraBlockIndex = index % 64;
  const isCenterPad = [27, 28, 35, 36].includes(intraBlockIndex);

  // Persist the last lightshow color to allow fade-out (tails)
  const lastLightshowColorRef = React.useRef<Color | null>(null);
  
  // Update ref when active data exists
  if (lightshowColorData) {
    lastLightshowColorRef.current = lightshowColorData;
  }

  // Use current data if active, otherwise fallback to last known color for fade-out
  const effectiveLightshowColor = lightshowColorData || lastLightshowColorRef.current;
  
  const baseColors = getColors(baseColorData, isSelected);
  const offColors = getColors(offColorData, false);
  const lightshowColorsSet = effectiveLightshowColor ? getColors(effectiveLightshowColor, false) : null;

  const margin = 2; // Safe margin for stroke (0-100 system)
  const scale = (100 - 2 * margin) / 100;
  const sC = (8 / 42) * 100 * scale;
  const sR = (3 / 42) * 100 * scale;
  const sF = (1.5 / 42) * 100 * scale;
  const min = margin;
  const max = 100 - margin;

  let pathD = "";
  if (isCenterPad) {
    if (intraBlockIndex === 27) {
      // Bottom-Right inner chamfer
      pathD = `M${min+sR},${min} H${max-sR} Q${max},${min} ${max},${min+sR} V${max-sC-sF} Q${max},${max-sC} ${max-sF},${max-sC+sF} L${max-sC+sF},${max-sF} Q${max-sC},${max} ${max-sC-sF},${max} H${min+sR} Q${min},${max} ${min},${max-sR} V${min+sR} Q${min},${min} ${min+sR},${min} Z`;
    } else if (intraBlockIndex === 28) {
      // Bottom-Left inner chamfer
      pathD = `M${min+sR},${min} H${max-sR} Q${max},${min} ${max},${min+sR} V${max-sR} Q${max},${max} ${max-sR},${max} H${min+sC+sF} Q${min+sC},${max} ${min+sC-sF},${max-sF} L${min+sF},${max-sC+sF} Q${min},${max-sC} ${min},${max-sC-sF} V${min+sR} Q${min},${min} ${min+sR},${min} Z`;
    } else if (intraBlockIndex === 35) {
      // Top-Right inner chamfer
      pathD = `M${min+sR},${min} H${max-sC-sF} Q${max-sC},${min} ${max-sC+sF},${min+sF} L${max-sF},${min+sC-sF} Q${max},${min+sC} ${max},${min+sC+sF} V${max-sR} Q${max},${max} ${max-sR},${max} H${min+sR} Q${min},${max} ${min},${max-sR} V${min+sR} Q${min},${min} ${min+sR},${min} Z`;
    } else if (intraBlockIndex === 36) {
      // Top-Left inner chamfer
      pathD = `M${min+sC+sF},${min} H${max-sR} Q${max},${min} ${max},${min+sR} V${max-sR} Q${max},${max} ${max-sR},${max} H${min+sR} Q${min},${max} ${min},${max-sR} V${min+sC+sF} Q${min},${min+sC} ${min+sF},${min+sC-sF} L${min+sC-sF},${min+sF} Q${min+sC},${min} ${min+sC+sF},${min} Z`;
    }
  } else {
    pathD = `M${min+sR},${min} H${max-sR} Q${max},${min} ${max},${min+sR} V${max-sR} Q${max},${max} ${max-sR},${max} H${min+sR} Q${min},${max} ${min},${max-sR} V${min+sR} Q${min},${min} ${min+sR},${min} Z`;
  }

  const paletteGradId = `palette-grad-${index}`;
  const offGradId = `off-grad-${index}`;
  const lightshowGradId = `ls-grad-${index}`;

  const padClass = `${styles.pad} ${isSelected ? styles.selected : ''} ${isLightshowActive ? styles.noTransition : ''}`;
  const padStyle = {
    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
  };

  const svgFilter = (() => {
    const size = isSelected ? 6 : (lightshowColorData ? 4 : 2);
    const color = lightshowColorData 
      ? getColors(lightshowColorData, false).glow 
      : (isLightshowActive ? offColors.glow : baseColors.glow);
    return `drop-shadow(0 0 ${size}px ${color})`;
  })();

  return (
    <div
      className={padClass}
      style={padStyle}
      onClick={() => onClick?.(index)}
    >
      <svg 
        viewBox="-5 -5 110 110" 
        style={{ filter: svgFilter }}
      >
        <defs>
          {/* Palette LED */}
          <radialGradient id={paletteGradId} cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
            <stop offset="0%" stopColor={baseColors.core} className={styles.gradientStop} />
            <stop offset="30%" stopColor={baseColors.core} className={styles.gradientStop} />
            <stop offset="70%" stopColor={baseColors.mid} className={styles.gradientStop} />
            <stop offset="100%" stopColor={baseColors.edge} className={styles.gradientStop} />
          </radialGradient>
          <radialGradient id={offGradId} cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
            <stop offset="0%" stopColor={offColors.core} className={styles.gradientStop} />
            <stop offset="30%" stopColor={offColors.core} className={styles.gradientStop} />
            <stop offset="70%" stopColor={offColors.mid} className={styles.gradientStop} />
            <stop offset="100%" stopColor={offColors.edge} className={styles.gradientStop} />
          </radialGradient>
          {lightshowColorsSet && (
            <radialGradient id={lightshowGradId} cx="50%" cy="50%" r="70%" fx="50%" fy="50%">
              <stop offset="0%" stopColor={lightshowColorsSet.core} />
              <stop offset="30%" stopColor={lightshowColorsSet.core} />
              <stop offset="70%" stopColor={lightshowColorsSet.mid} />
              <stop offset="100%" stopColor={lightshowColorsSet.edge} />
            </radialGradient>
          )}
        </defs>
        
        {/* MIDI Keymatt */}
        <path
          d={pathD}
          fill={`url(#${offGradId})`}
        />

        {/* Palette LED & Outline when Selected */}
        <path
          d={pathD}
          fill={`url(#${paletteGradId})`}
          fillOpacity={isLightshowActive ? 0 : 1}
          stroke={isSelected ? "#fff" : "none"}
          strokeWidth={isSelected ? 4 : 0}
          strokeLinejoin="round"
          className={styles.paletteOverlay}
        />

        {/* MIDI LED */}
        {lightshowColorsSet && (
          <path
            d={pathD}
            fill={`url(#${lightshowGradId})`}
            style={{ 
              transition: 'none', // MIDI Lightshow should always be non-transitioning
              opacity: lightshowColorData ? 1 : 0 
            }}
          />
        )}

        {/* Outline */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          pointerEvents="none"
          style={{ 
            clipPath: 'inset(1% 1% 2% 1%)',
          }}
        />
      </svg>

      {isSelected && !isLightshowActive && (
        <div className={`${styles.padLabel} font-size-sm`}>
          {index}
        </div>
      )}
    </div>
  );
});

export const PaletteGrid: React.FC<PaletteGridProps> = ({
  palette,
  selectedIndex,
  onColorSelect,
  lightshowColors,
  isLightshowActive
}) => {
  const baseColors = palette.colors;

  const mystrixHousing = (startIdx: number, title: string) => (
    <div className={styles.housingContainer}>
      <div className={styles.housing}>
        <div className={styles.grid}>
          {Array.from({ length: 64 }, (_, i) => {
            const idx = startIdx + i;
            return (
              <Pad
                key={idx}
                index={idx}
                baseColorData={baseColors[idx] || { r: 0, g: 0, b: 0 }}
                offColorData={baseColors[0] || { r: 0, g: 0, b: 0 }}
                lightshowColorData={lightshowColors ? lightshowColors.get(idx) : null}
                isSelected={selectedIndex === idx}
                onClick={onColorSelect}
                isLightshowActive={isLightshowActive}
              />
            );
          })}
        </div>
      </div>
      <div className={`${styles.housingLabel} text-code color-muted font-size-md`}>{title}</div>
    </div>
  );

  return (
    <div className={styles.gridContainer}>
      {mystrixHousing(0, '0 - 63')}
      {mystrixHousing(64, '64 - 127')}
    </div>
  );
};

