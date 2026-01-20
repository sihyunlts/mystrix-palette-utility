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
  const [value, setValue] = useState(100); // HSV value (brightness)
  const pickerRef = useRef<HTMLDivElement>(null);
  const slRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Convert RGB to HSV
  useEffect(() => {
    const { h, s, v } = rgbToHsv(color.r, color.g, color.b);
    // Preserving hue for gray colors
    if (s > 0) {
      setHue(h);
    }
    setSaturation(s);
    setValue(v);
  }, [color]);

  // Convert HSV to RGB
  const hsvToRgb = (h: number, s: number, v: number): Color => {
    s /= 100;
    v /= 100;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
      r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
      r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
      r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  };

  // Convert RGB to HSV
  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
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
      v: Math.round(v * 100)
    };
  };

  const handleColorChange = (newH: number, newS: number, newV: number) => {
    setHue(newH);
    setSaturation(newS);
    setValue(newV);
    const newColor = hsvToRgb(newH, newS, newV);
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
      const v = Math.round(100 - (y / rect.height) * 100);
      handleColorChange(hue, s, v);
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
      // Hue is periodic, handle 360 as 0
      const finalH = h === 360 ? 0 : h;
      handleColorChange(finalH, saturation, value);
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
          {/* Saturation/Value picker */}
          <div
            ref={slRef}
            className={styles.slPicker}
            style={{ backgroundColor: `hsl(${hue}, 100%, 50%)` }}
            onMouseDown={handleSLMouseDown}
          >
            <div className={styles.slGradient} />
            <div
              className={styles.slCursor}
              style={{
                left: `${saturation}%`,
                top: `${100 - value}%`
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
                  onChange={(e) => {
                    const val = Math.min(255, Math.max(0, parseInt(e.target.value) || 0));
                    onChange({ ...color, [channel]: val });
                  }}
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
