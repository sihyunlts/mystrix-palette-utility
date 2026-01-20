import React from 'react';
import styles from './Slider.module.css';

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
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {label && <span className={`${styles.label} font-size-sm`}>{label}</span>}
        {valueDisplay && (
          <code className={`${styles.valueDisplay} font-size-sm ${isChanged ? styles.changed : ''}`}>
            {valueDisplay}
          </code>
        )}
      </div>
      <div className={styles.sliderWrapper}>
         {/* Track */}
        <div className={styles.track}>
           <div className={styles.fill} style={{ width: `${percentage}%` }} />
        </div>
        
        {/* Input */}
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={styles.input}
        />
        
        {/* Thumb (Visual Only) */}
        <div className={styles.thumb} style={{ left: `${percentage}%` }} />
      </div>
    </div>
  );
};
