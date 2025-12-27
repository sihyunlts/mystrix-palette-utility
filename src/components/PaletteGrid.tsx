import React, { memo, useRef } from 'react';
import { Color, Palette } from '../types';

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

// Meticulously preserve the "Version 3" Lighting Math
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

  const baseGradId = `base-grad-${index}`;
  const offGradId = `off-grad-${index}`;
  const lightshowGradId = `ls-grad-${index}`;

  return (
    <div
      style={{
        width: '100%',
        height: '100%', // Explicit height for aspect ratio stability
        aspectRatio: '1 / 1',
        position: 'relative',
        transition: 'all 0.1s ease-out',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)', // Slight reduction to prevent excessive overflow
        zIndex: isSelected ? 10 : 1,
      }}
      onClick={() => onClick?.(index)}
    >
      <svg 
        viewBox="-5 -5 110 110" 
        style={{ 
          width: '100%', 
          height: '100%', 
          overflow: 'visible',
          filter: lightshowColorData // Use active data for glow logic
            ? `drop-shadow(0 0 6px ${getColors(lightshowColorData, false).glow})`
            : (isLightshowActive 
                ? `drop-shadow(0 0 2px ${offColors.glow})`
                : (isSelected ? `drop-shadow(0 0 6px ${baseColors.glow})` : `drop-shadow(0 0 2px ${baseColors.glow})`)
              ),
          transition: 'filter 0.2s ease-out' 
        }}
      >
        <defs>
          <radialGradient id={baseGradId} cx="50%" cy="50%" r="71%" fx="50%" fy="50%">
            <stop offset="0%" stopColor={baseColors.core} style={{ transition: 'stop-color 0.25s ease-in-out' }} />
            <stop offset="30%" stopColor={baseColors.core} style={{ transition: 'stop-color 0.25s ease-in-out' }} />
            <stop offset="70%" stopColor={baseColors.mid} style={{ transition: 'stop-color 0.25s ease-in-out' }} />
            <stop offset="100%" stopColor={baseColors.edge} style={{ transition: 'stop-color 0.25s ease-in-out' }} />
          </radialGradient>
          <radialGradient id={offGradId} cx="50%" cy="50%" r="71%" fx="50%" fy="50%">
            <stop offset="0%" stopColor={offColors.core} style={{ transition: 'stop-color 0.25s ease-in-out' }} />
            <stop offset="30%" stopColor={offColors.core} style={{ transition: 'stop-color 0.25s ease-in-out' }} />
            <stop offset="70%" stopColor={offColors.mid} style={{ transition: 'stop-color 0.25s ease-in-out' }} />
            <stop offset="100%" stopColor={offColors.edge} style={{ transition: 'stop-color 0.25s ease-in-out' }} />
          </radialGradient>
          {lightshowColorsSet && (
            <radialGradient id={lightshowGradId} cx="50%" cy="50%" r="71%" fx="50%" fy="50%">
              <stop offset="0%" stopColor={lightshowColorsSet.core} />
              <stop offset="30%" stopColor={lightshowColorsSet.core} />
              <stop offset="70%" stopColor={lightshowColorsSet.mid} />
              <stop offset="100%" stopColor={lightshowColorsSet.edge} />
            </radialGradient>
          )}
        </defs>
        
        {/* Bottom Layer: Always "Off" (Index 0) Structure */}
        <path
          d={pathD}
          fill={`url(#${offGradId})`}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Foreground Layer: Current Palette Colors */}
        <path
          d={pathD}
          fill={`url(#${baseGradId})`}
          fillOpacity={isLightshowActive ? 0 : 1}
          stroke={isSelected && !isLightshowActive ? "#fff" : "none"}
          strokeWidth={isSelected ? 4 : 0}
          strokeLinejoin="round"
          style={{ 
            transition: 'all 0.25s ease-in-out',
          }}
        />

        {/* Lightshow Override Layer */}
        {lightshowColorsSet && (
          <path
            d={pathD}
            fill={`url(#${lightshowGradId})`}
            stroke="none"
            strokeWidth={0}
            strokeLinejoin="round"
            style={{ 
              transition: 'opacity 0.08s ease-out',
              // Use lightshowColorData existence to toggle opacity, keeping element mounted via effectiveLightshowColor
              opacity: lightshowColorData ? 1 : 0 
            }}
          />
        )}

        <path
          d={pathD}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          pointerEvents="none"
          style={{ 
            clipPath: 'inset(1% 1% 4% 1%)',
          }}
        />
      </svg>

      {isSelected && !isLightshowActive && (
        <div style={{
          position: 'absolute',
          bottom: '-22px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff',
          color: '#000',
          fontSize: '10px',
          fontWeight: 700,
          padding: '1px 5px',
          borderRadius: '2px',
          whiteSpace: 'nowrap',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}>
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
  const gapSize = '0.4%'; // Percentage-based gap for proportional scaling

  const renderHardwareBlock = (startIdx: number, title: string) => (
    <div style={{ textAlign: 'center', flex: '1 1 360px' }}>
      <div style={{
        backgroundColor: 'var(--color-bg-surface-alt)',
        padding: '3.4%', // Percentage-based padding for proportional scaling
        borderRadius: 'var(--radius-main)',
        border: '1px solid var(--color-bg-surface)',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), var(--shadow-pad)',
        width: '100%',
        aspectRatio: '1 / 1', // Mandatory square frame
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, 1fr)`,
          gridTemplateRows: `repeat(8, 1fr)`,
          gap: gapSize,
          width: '100%',
          height: '100%',
          aspectRatio: '1 / 1',
          boxSizing: 'border-box'
        }}>
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
      <div style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</div>
    </div>
  );

  return (
    <div style={{ 
      display: 'flex', 
      gap: '20px', 
      marginBottom: '20px',
      justifyContent: 'center',
      flexWrap: 'wrap' // Allow wrapping on small screens
    }}>
      {renderHardwareBlock(0, '0-63')}
      {renderHardwareBlock(64, '64-127')}
    </div>
  );
};

