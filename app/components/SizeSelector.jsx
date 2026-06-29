'use client';

/**
 * app/components/SizeSelector.jsx
 * Renders S / M / L / XL / XXL size buttons.
 * Out-of-stock sizes are visually disabled and unclickable.
 * Shows an inline error if the user tries to submit without selecting.
 *
 * Props:
 *   sizes      → string[]  — ordered list, e.g. ['S','M','L','XL','XXL']
 *   selected   → string | null — currently selected size
 *   onChange   → (size: string) => void
 *   stockMap   → { [size]: number } — stock per size for the active color
 *   error      → boolean — true to show the "please select a size" prompt
 */

export default function SizeSelector({
  sizes,
  selected,
  onChange,
  stockMap = {},
  error = false,
}) {
  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black tracking-[0.18em] uppercase text-black">
          Size
        </span>
        {selected && (
          <span className="text-[11px] text-gray-500">{selected}</span>
        )}
      </div>

      {/* Size buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {sizes.map((size) => {
          const inStock  = (stockMap[size] ?? 1) > 0;
          const isActive = selected === size;

          return (
            <button
              key={size}
              type="button"
              disabled={!inStock}
              onClick={() => inStock && onChange(size)}
              aria-label={
                inStock
                  ? `Select size ${size}`
                  : `Size ${size} — out of stock`
              }
              aria-pressed={isActive}
              className={`
                relative
                min-w-[44px] h-[44px] px-2
                text-[12px] font-bold tracking-[0.08em] uppercase
                border
                transition-all duration-150
                select-none
                ${isActive
                  ? 'bg-black text-white border-black'
                  : inStock
                    ? 'bg-white text-black border-black hover:bg-gray-100 active:scale-95'
                    : 'bg-white text-gray-300 border-gray-200 cursor-not-allowed'
                }
              `}
            >
              {/* Out-of-stock diagonal strikethrough */}
              {!inStock && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span
                    className="absolute w-full h-[1px] bg-gray-300 rotate-[135deg] origin-center"
                  />
                </span>
              )}
              {size}
            </button>
          );
        })}
      </div>

      {/* Validation error */}
      {error && (
        <p
          role="alert"
          className="mt-2.5 text-[11px] font-bold tracking-wide text-black uppercase"
        >
          ↑ Please select a size to continue.
        </p>
      )}

      {/* Size guide nudge */}
      <p className="mt-3 text-[11px] text-gray-400">
        Not sure?{' '}
        <button
          type="button"
          className="underline underline-offset-2 text-black hover:text-gray-600 transition-colors"
          onClick={() => alert('Size guide coming soon.')}
        >
          View size guide
        </button>
      </p>
    </div>
  );
}
