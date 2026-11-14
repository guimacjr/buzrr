"use client";

export default function RangeSlider({
  min,
  max,
  value,
  onChange,
  ticks,
  label,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  ticks: string[];
  label: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-[22px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-theme-surface [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-theme-primary [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.25)] [&::-moz-range-thumb]:size-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-theme-surface [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-theme-primary focus-visible:ring-4 focus-visible:ring-theme-primary/30"
        style={{
          background: `linear-gradient(90deg, var(--color-theme-primary) 0, var(--color-theme-accentDeep) ${pct}%, color-mix(in srgb, var(--color-theme-primary) 15%, transparent) ${pct}%)`,
        }}
      />
      <div
        className="-mt-1 flex justify-between text-[11.5px] font-medium text-theme-muted dark:text-theme-muted"
        aria-hidden="true"
      >
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </>
  );
}
