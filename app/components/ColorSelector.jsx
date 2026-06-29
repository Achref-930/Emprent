'use client';

/**
 * app/components/ColorSelector.jsx
 * Renders Black / White color swatches.
 * Strictly B&W — no color accent ever touches this component.
 *
 * Props:
 *   colors     → array of color keys, e.g. ['black', 'white']
 *   selected   → currently active color key string
 *   onChange   → (colorKey: string) => void
 */

import { Check } from 'lucide-react';

const SWATCH_CONFIG = {
  black: {
    label:      'Black',
    bg:         'bg-black',
    border:     'border-black',
    checkColor: 'text-white',
    ring:       'ring-black',
  },
  white: {
    label:      'White',
    bg:         'bg-white',
    border:     'border-black',
    checkColor: 'text-black',
    ring:       'ring-black',
  },
};

export default function ColorSelector({ colors, selected, onChange }) {
  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black tracking-[0.18em] uppercase text-black">
          Colour
        </span>
        <span className="text-[11px] text-gray-500 capitalize">
          {SWATCH_CONFIG[selected]?.label ?? selected}
        </span>
      </div>

      {/* Swatches */}
      <div className="flex items-center gap-3">
        {colors.map((colorKey) => {
          const cfg       = SWATCH_CONFIG[colorKey];
          const isActive  = selected === colorKey;

          return (
            <button
              key={colorKey}
              type="button"
              onClick={() => onChange(colorKey)}
              aria-label={`Select colour: ${cfg?.label ?? colorKey}`}
              aria-pressed={isActive}
              className={`
                relative
                w-9 h-9
                rounded-full
                border-2
                flex items-center justify-center
                transition-all duration-150
                ${cfg?.bg}
                ${cfg?.border}
                ${isActive
                  ? `ring-2 ring-offset-2 ${cfg?.ring}`
                  : 'opacity-60 hover:opacity-100'
                }
              `}
            >
              {isActive && (
                <Check
                  size={14}
                  strokeWidth={2.5}
                  className={cfg?.checkColor}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
