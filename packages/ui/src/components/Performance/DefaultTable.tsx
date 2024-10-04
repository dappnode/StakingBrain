import {
  ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";

export default function DefalutTable<T>({
  title,
  data,
  getColumns,
}: {
  title: string;
  data: T[];
  getColumns: () => ColumnDef<T, any>[];
}): JSX.Element {
  const table = useReactTable({
    columns: getColumns(),
    data: data || [],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="border-interface-300 flex w-full flex-col overflow-x-auto rounded border dark:border-dark-interface-400">
      <div className="bg-interface-200 flex items-center justify-center py-5 text-2xl dark:bg-dark-interface-300">
        {title}
      </div>
      <table className="bg-interface-100 w-full table-auto border-collapse dark:bg-dark-interface-100">
        {/* Table headers */}
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-interface-000 border-b dark:bg-dark-interface-000">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-2 text-left text-lg">
                  {header.isPlaceholder ? null : (
                    <p className="text-left">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </p>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        {/* Table body */}
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="bg-interface-100 border dark:bg-dark-interface-100">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-4 text-left">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
