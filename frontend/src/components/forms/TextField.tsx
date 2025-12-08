import type { TextareaHTMLAttributes, InputHTMLAttributes } from 'react';

type TextFieldProps = {
  label: string;
  error?: string;
  textarea?: boolean;
} & (TextareaHTMLAttributes<HTMLTextAreaElement> | InputHTMLAttributes<HTMLInputElement>);

export const TextField = ({
  label,
  error,
  textarea,
  ...props
}: TextFieldProps) => {
  const baseClass =
    'mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {textarea ? (
        <textarea className={`${baseClass} resize-none`} {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input className={baseClass} {...(props as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </label>
  );
};
