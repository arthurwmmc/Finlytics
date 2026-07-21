"use client";

import { InputHTMLAttributes, useState } from "react";
import { inputBaseClass } from "./field";

/** Formata uma sequência de dígitos como "1.234,56" (acumulador de centavos). */
function formatDigits(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (!clean) return "";
  const n = parseInt(clean, 10);
  const reais = Math.floor(n / 100);
  const cents = String(n % 100).padStart(2, "0");
  return `${reais.toLocaleString("pt-BR")},${cents}`;
}

/**
 * Campo de dinheiro com máscara ao vivo e prefixo "R$". O valor enviado no
 * form fica no formato "1.234,56", que `parseBRL` já entende.
 */
export function MoneyInput({
  defaultValue,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  const [value, setValue] = useState(() =>
    defaultValue != null ? formatDigits(String(defaultValue)) : ""
  );

  return (
    <div className="relative">
      <span
        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm pointer-events-none"
        aria-hidden
      >
        R$
      </span>
      <input
        inputMode="numeric"
        className={`${inputBaseClass} pl-10 ${className}`}
        value={value}
        onChange={(e) => setValue(formatDigits(e.target.value))}
        {...props}
      />
    </div>
  );
}
