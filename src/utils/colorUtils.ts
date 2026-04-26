import { Color } from '../types';

export const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
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
    return { h: h * 360, s: s, l: l };
};

export const hslToRgb = (h: number, s: number, l: number): Color => {
    // Wrap hue
    h = h % 360; 
    if(h < 0) h += 360;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
};

export const applyGlobalSettings = (
    colors: Color[],
    saturation: number,
    contrast: number,
    hueShift: number
): Color[] => {
    if (saturation === 0 && contrast === 0 && hueShift === 0) return colors;

    return colors.map((c) => {
        if (!c) return { r: 0, g: 0, b: 0 };
        // Skip off LEDs - they should not be affected by contrast
        if (c.r === 0 && c.g === 0 && c.b === 0) return c;
        
        // 1. Apply Hue + Saturation (HSL)
        let { h, s, l } = rgbToHsl(c.r, c.g, c.b);
        h += hueShift;
        const satFactor = 1 + (saturation / 100);
        s = Math.max(0, Math.min(1, s * satFactor));
        let rgb = hslToRgb(h, s, l);

        // 2. Apply Contrast (RGB)
        const conFactor = 1 + (contrast / 100);
        
        const applyContrast = (val: number) => {
            return Math.max(0, Math.min(255, Math.round(128 + (val - 128) * conFactor)));
        };

        rgb.r = applyContrast(rgb.r);
        rgb.g = applyContrast(rgb.g);
        rgb.b = applyContrast(rgb.b);

        return rgb;
    });
};
