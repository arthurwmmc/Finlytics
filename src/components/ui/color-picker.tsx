"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const RING = "ring-2 ring-white ring-offset-2 ring-offset-[#111827]";

/**
 * Seletor de cor: swatches pré-definidos + opção de cor personalizada
 * (input nativo type=color). Emite um input hidden com o valor escolhido.
 */
export function ColorPicker({
  name,
  presets,
  defaultValue,
}: {
  name: string;
  presets: readonly string[];
  defaultValue?: string;
}) {
  const [color, setColor] = useState(defaultValue ?? presets[0]);
  const isCustom = !presets.includes(color);

  return (
    <div className="flex gap-2 flex-wrap items-center" role="group" aria-label="Cor">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Cor ${c}`}
          aria-pressed={color === c}
          onClick={() => setColor(c)}
          className={`size-8 rounded-full transition ${
            color === c ? RING : "opacity-70 hover:opacity-100"
          }`}
          style={{ background: c }}
        />
      ))}

      {/* swatch de cor personalizada */}
      <label
        title="Cor personalizada"
        className={`relative size-8 rounded-full cursor-pointer grid place-items-center transition ${
          isCustom ? RING : "opacity-80 hover:opacity-100"
        }`}
        style={{
          background: isCustom
            ? color
            : "conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #06b6d4, #6366f1, #ec4899, #ef4444)",
        }}
      >
        <input
          type="color"
          value={isCustom ? color : "#22d3ee"}
          onChange={(e) => setColor(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Escolher cor personalizada"
        />
        {!isCustom && <Plus size={14} className="text-white drop-shadow" />}
      </label>

      <input type="hidden" name={name} value={color} />
    </div>
  );
}
