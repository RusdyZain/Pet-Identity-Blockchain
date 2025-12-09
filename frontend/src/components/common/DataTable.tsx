import type { ReactNode } from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, emptyMessage = 'Data tidak tersedia' }: DataTableProps<T>) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/30 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-white/60 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-mist text-secondary/80 uppercase text-xs tracking-widest">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-5 py-4 font-semibold">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIndex) => (
            <tr
              key={rowIndex}
              className={rowIndex % 2 === 0 ? 'bg-white/90' : 'bg-mist/40'}
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-5 py-4 text-slate-700">
                  {col.render ? col.render(item) : ((item as any)[col.key] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
