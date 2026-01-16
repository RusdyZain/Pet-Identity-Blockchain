import type { SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

// Dropdown sederhana dengan label dan daftar opsi.
export const SelectField = ({ label, options, ...props }: SelectFieldProps) => {
  return (
    <label className="block text-sm font-semibold text-secondary/80">
      {label}
      <select
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
};
