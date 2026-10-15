import React, { useState } from 'react';
import { Palette, Pipette } from 'lucide-react';
import { COLOR_PRESETS } from '../engine/gameEngine';

interface ColorPalettePickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  label?: string;
}

export const ColorPalettePicker: React.FC<ColorPalettePickerProps> = ({
  selectedColor,
  onSelectColor,
  label = 'Coin Color',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-cyan-400" />
          {label}
        </span>

        {/* Selected Color Badge & Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-game-surfaceLight border border-slate-300 dark:border-slate-700/60 hover:border-cyan-400 transition"
          >
            <span
              className="w-4 h-4 rounded-full border border-white/80 shadow-sm relative overflow-hidden shrink-0"
              style={{ backgroundColor: selectedColor }}
            >
              <span className="absolute inset-0 rounded-full coin-gloss" />
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
              {selectedColor}
            </span>
          </button>
        </div>
      </div>

      {/* Preset Swatches + Full Spectrum Custom Picker */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {COLOR_PRESETS.map((color) => {
          const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
          return (
            <button
              key={color}
              type="button"
              onClick={() => onSelectColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-all relative overflow-hidden ${
                isSelected
                  ? 'border-white scale-110 ring-2 ring-cyan-400 shadow-lg'
                  : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            >
              <span className="absolute inset-0 rounded-full coin-gloss" />
            </button>
          );
        })}

        {/* Custom Spectrum HTML5 Color Picker */}
        <label
          className="w-7 h-7 rounded-full border border-dashed border-cyan-400/80 bg-gradient-to-tr from-rose-500 via-amber-400 to-cyan-400 flex items-center justify-center cursor-pointer hover:scale-110 transition shadow-sm relative overflow-hidden"
          title="Pick custom color from full RGB spectrum"
        >
          <Pipette className="w-3.5 h-3.5 text-white drop-shadow-md" />
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onSelectColor(e.target.value)}
            className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
          />
        </label>
      </div>
    </div>
  );
};
