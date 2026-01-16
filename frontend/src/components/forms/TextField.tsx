import type { TextareaHTMLAttributes, InputHTMLAttributes } from 'react';

type TextFieldProps = {
  label: string;
  error?: string;
  textarea?: boolean;
} & (TextareaHTMLAttributes<HTMLTextAreaElement> | InputHTMLAttributes<HTMLInputElement>);

// Input teks serbaguna yang bisa menjadi input biasa atau textarea.
export const TextField = ({
  label,
  error,
  textarea,
  ...props
}: TextFieldProps) => {
  // Kelas dasar agar tampilan konsisten di seluruh form.
  const baseClass =
    'mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition';

  return (
    <label className="block text-sm font-semibold text-secondary/80">
      {label}
      {textarea ? (
        <textarea
          className={`${baseClass} resize-none`}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input className={baseClass} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </label>
  );
};
