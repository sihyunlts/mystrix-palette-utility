import React, { useState, useRef, useEffect } from 'react';
import { Color } from '../types';
import styles from './ColorPicker.module.css';

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
  const slRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Convert RGB to HSL
  useEffect(() => {
    const { h, s, l } = rgbToHsl(color.r, color.g, color.b);
    // If saturation is 0 (achromatic), preserve the current hue instead of resetting to 0
    if (s > 0) {
      setHue(h);
    }
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

  const handleSLMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!slRef.current) return;
    const rect = slRef.current.getBoundingClientRect();

    const update = (clientX: number, clientY: number) => {
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
      const s = Math.round((x / rect.width) * 100);
      const l = Math.round(100 - (y / rect.height) * 100);
      handleColorChange(hue, s, l);
    };

    update(e.clientX, e.clientY);

    const onMouseMove = (me: MouseEvent) => {
        update(me.clientX, me.clientY);
    };

    const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();

    const update = (clientX: number) => {
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const h = Math.round((x / rect.width) * 360);
      handleColorChange(h, saturation, lightness);
    };

    update(e.clientX);

    const onMouseMove = (me: MouseEvent) => {
        update(me.clientX);
    };

    const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const swatchStyle = {
    backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
    width: size,
    height: size
  };

  return (
    <div className={styles.container}>
      <div
        className={styles.colorSwatch}
        style={swatchStyle}
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}
      />
      
      {isOpen && (
        <>
          <div 
            className={styles.backdrop}
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={pickerRef}
            onClick={(e) => e.stopPropagation()} 
            className={styles.picker}
            style={{ top: size + 10 }}
            >
          {/* Saturation/Lightness picker */}
          <div
            ref={slRef}
            className={styles.slPicker}
            style={{ background: `hsl(${hue}, 100%, 50%)` }}
            onMouseDown={handleSLMouseDown}
          >
            <div className={styles.slGradient} />
            <div
              className={styles.slCursor}
              style={{
                left: `${saturation}%`,
                top: `${100 - lightness}%`
              }}
            />
          </div>

          {/* Hue picker */}
          <div
            ref={hueRef}
            className={styles.huePicker}
            onMouseDown={handleHueMouseDown}
          >
            <div
              className={styles.hueCursor}
              style={{ left: `${hue / 3.6}%` }}
            />
          </div>

          {/* RGB inputs */}
          <div className={styles.rgbInputs}>
            {['r', 'g', 'b'].map((channel) => (
                <div key={channel} className={styles.inputGroup}>
                    <label className={`${styles.label} font-size-sm`}>{channel.toUpperCase()}</label>
                    <input
                    type="number"
                    min="0"
                    max="255"
                    value={(color as any)[channel]}
                    onChange={(e) => onChange({ ...color, [channel]: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
                    className={`${styles.input} font-size-sm`}
                    />
                </div>
            ))}
          </div>
        </div>
        </>
      )}
    </div>
  );
};
