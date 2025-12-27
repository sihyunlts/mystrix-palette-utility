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
        onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
        }}
      />
      
      {isOpen && (
        <>
          <div 
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999,
                cursor: 'default'
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={pickerRef}
            onClick={(e) => e.stopPropagation()} 
            style={{
                position: 'absolute',
                top: size + 10,
                left: 0,
                background: 'var(--color-bg-surface)',
                padding: '12px',
                borderRadius: 'var(--radius-main)',
                border: '1px solid var(--color-border)',
                zIndex: 1000,
                minWidth: '220px',
                boxShadow: 'var(--shadow-intense)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}
            >
          {/* Saturation/Lightness picker */}
          <div
            ref={slRef}
            style={{
              width: '100%',
              height: '140px',
              background: `hsl(${hue}, 100%, 50%)`,
              position: 'relative',
              cursor: 'crosshair',
              borderRadius: '2px',
              overflow: 'hidden'
            }}
            onMouseDown={handleSLMouseDown}
          >
            <div
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(to right, white, transparent), linear-gradient(to top, black, transparent)',
                pointerEvents: 'none'
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${saturation}%`,
                top: `${100 - lightness}%`,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                border: '2px solid white',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
              }}
            />
          </div>

          {/* Hue picker */}
          <div
            ref={hueRef}
            style={{
              width: '100%',
              height: '16px',
              background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '8px'
            }}
            onMouseDown={handleHueMouseDown}
          >
            <div
              style={{
                position: 'absolute',
                left: `${hue / 3.6}%`,
                top: '50%',
                width: '12px',
                height: '12px',
                background: 'white',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                pointerEvents: 'none'
              }}
            />
          </div>

          {/* RGB inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {['r', 'g', 'b'].map((channel) => (
                <div key={channel} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="text-label" style={{ fontSize: '10px' }}>{channel.toUpperCase()}</label>
                    <input
                    type="number"
                    min="0"
                    max="255"
                    value={(color as any)[channel]}
                    onChange={(e) => onChange({ ...color, [channel]: Math.min(255, Math.max(0, parseInt(e.target.value) || 0)) })}
                    style={{ 
                        width: '100%', 
                        padding: '6px',
                        backgroundColor: 'var(--color-bg-subtle)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-subtle)',
                        color: 'var(--color-text-main)',
                        fontSize: '12px'
                    }}
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
