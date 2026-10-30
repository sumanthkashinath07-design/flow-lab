import * as Slider from '@radix-ui/react-slider';

interface RangeControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  digits?: number;
  onChange: (value: number) => void;
  hint?: string;
}

export default function RangeControl({ label, value, min, max, step, unit = '', digits = 0, onChange, hint }: RangeControlProps) {
  const display = new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  return (
    <div className="range-control">
      <div className="range-heading">
        <label>{label}</label>
        <output>{display}<span>{unit}</span></output>
      </div>
      {hint && <div className="range-hint">{hint}</div>}
      <Slider.Root
        className="slider-root"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => onChange(next[0] ?? min)}
        aria-label={label}
      >
        <Slider.Track className="slider-track"><Slider.Range className="slider-range" /></Slider.Track>
        <Slider.Thumb className="slider-thumb" aria-label={label} />
      </Slider.Root>
      <div className="range-limits"><span>{min}{unit}</span><span>{max}{unit}</span></div>
    </div>
  );
}
