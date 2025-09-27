import React, { useState, useRef, useEffect } from 'react';
import { Color } from '../types';

interface ColorPickerProps {
  color: Color;
  onChange: (color: Color) => void;
  size?: number;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  color, 
  onChange, 
  size = 40 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Convert RGB to HSL
  useEffect(() => {
    const { h, s, l } = rgbToHsl(color.r, color.g, color.b);
    setHue(h);
    setSaturation(s);
    setLightness(l);
  }, [color]);

  // Convert HSL to RGB
  const hslToRgb = (h: number, s: number, l: number): Color => {
    h /= 360;
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 2/6) {
      r = x; g = c; b = 0;
    } else if (2/6 <= h && h < 3/6) {
      r = 0; g = c; b = x;
    } else if (3/6 <= h && h < 4/6) {
      r = 0; g = x; b = c;
    } else if (4/6 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  // Convert RGB to HSL
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  const handleColorChange = (newH: number, newS: number, newL: number) => {
    setHue(newH);
    setSaturation(newS);
    setLightness(newL);
    const newColor = hslToRgb(newH, newS, newL);
    onChange(newColor);
  };

  const handleSaturationLightnessChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = Math.round((x / rect.width) * 100);
    const l = Math.round(100 - (y / rect.height) * 100);
    handleColorChange(hue, s, l);
  };

  const handleHueChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const h = Math.round((x / rect.width) * 360);
    handleColorChange(h, saturation, lightness);
  };

  const colorStyle = {
    backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
    width: size,
    height: size,
    borderRadius: '4px',
    border: '2px solid #333',
    cursor: 'pointer'
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={colorStyle}
        onClick={() => setIsOpen(!isOpen)}
      />
      
      {isOpen && (
        <div
          ref={pickerRef}
          style={{
            position: 'absolute',
            top: size + 5,
            left: 0,
            background: '#333',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #555',
            zIndex: 1000,
            minWidth: '200px'
          }}
        >
          {/* Saturation/Lightness picker */}
          <div
            style={{
              width: '180px',
              height: '120px',
              background: `hsl(${hue}, 100%, 50%)`,
              position: 'relative',
              cursor: 'crosshair',
              marginBottom: '10px'
            }}
            onClick={handleSaturationLightnessChange}
          >
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(to right, white, transparent), linear-gradient(to top, black, transparent)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${saturation}%`,
                top: `${100 - lightness}%`,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                border: '2px solid white',
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>

          {/* Hue picker */}
          <div
            style={{
              width: '180px',
              height: '20px',
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              cursor: 'pointer',
              position: 'relative'
            }}
            onClick={handleHueChange}
          >
            <div
              style={{
                position: 'absolute',
                left: `${hue / 3.6}%`,
                top: '50%',
                width: '4px',
                height: '24px',
                background: 'white',
                transform: 'translate(-50%, -50%)',
                borderRadius: '2px'
              }}
            />
          </div>

          {/* RGB inputs */}
          <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
            <input
              type="number"
              min="0"
              max="255"
              value={color.r}
              onChange={(e) => onChange({ ...color, r: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
              style={{ width: '50px', padding: '2px' }}
              placeholder="R"
            />
            <input
              type="number"
              min="0"
              max="255"
              value={color.g}
              onChange={(e) => onChange({ ...color, g: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
              style={{ width: '50px', padding: '2px' }}
              placeholder="G"
            />
            <input
              type="number"
              min="0"
              max="255"
              value={color.b}
              onChange={(e) => onChange({ ...color, b: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
              style={{ width: '50px', padding: '2px' }}
              placeholder="B"
            />
          </div>
        </div>
      )}
    </div>
  );
};
