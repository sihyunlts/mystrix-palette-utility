import React from 'react';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  valueDisplay?: React.ReactNode;
}

export const Slider: React.FC<SliderProps> = ({ 
  value, 
  min, 
  max, 
  onChange, 
  label,
  valueDisplay 
}) => {
  const isChanged = value !== 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {label && <span className="text-label">{label}</span>}
        {valueDisplay && (
          <code 
            className="text-code" 
            style={{ color: isChanged ? 'var(--color-accent)' : 'var(--color-text-dim)' }}
          >
            {valueDisplay}
          </code>
        )}
      </div>
      <div style={{ position: 'relative', height: '4px', width: '100%', display: 'flex', alignItems: 'center' }}>
         {/* Track */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: '#333',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
           <div style={{
               height: '100%',
               width: `${((value - min) / (max - min)) * 100}%`,
               backgroundColor: 'var(--color-accent)',
               transition: 'width 0.1s ease-out'
           }} />
        </div>
        
        {/* Input */}
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ 
            width: '100%', 
            cursor: 'pointer', 
            height: '100%', 
            opacity: 0, // Hide default input but keep it interactive
            margin: 0,
            zIndex: 2,
            position: 'absolute'
          }}
        />
        
        {/* Thumb (Visual Only) */}
        <div style={{
             position: 'absolute',
             left: `${((value - min) / (max - min)) * 100}%`,
             width: '12px',
             height: '12px',
             backgroundColor: '#fff',
             borderRadius: '50%',
             transform: 'translate(-50%)',
             pointerEvents: 'none',
             boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
             zIndex: 1,
             transition: 'left 0.1s ease-out'
        }} />
      </div>
    </div>
  );
};
