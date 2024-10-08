import {
  ColumnDef,
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
  getSortedRowModel,
  flexRender,
  Table,
} from "@tanstack/react-table";
import { useState } from "react";

export default function DefalutTable<T>({
  title,
  data,
  getColumns,
  pagination = false,
}: {
  title: string;
  data: T[];
  getColumns: () => ColumnDef<T, any>[];
  pagination?: boolean;
}): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);


  const table = useReactTable({
    columns: getColumns(),
    data: data || [],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), // Enable sorting
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined, 
    state: {
      sorting, 
    },
    onSortingChange: setSorting,

  });

  return (
    <div className="flex w-full flex-col overflow-x-auto rounded border border-interface-300 dark:border-dark-interface-200">
      <div className="flex items-center justify-center bg-interface-100 py-5 text-2xl dark:bg-dark-interface-100">
        {title}
      </div>
      <table className="w-full table-auto border-collapse border-spacing-8">
        {/* Table headers */}
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              className="bg-interface-300 dark:bg-dark-interface-300"
            >
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-2 text-left text-lg">
                  {header.isPlaceholder ? null : (
                    <div className="text-left">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        {/* Table body */}
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b bg-interface-100 dark:border-dark-interface-200 dark:bg-dark-interface-100"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-4 text-left">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination && <Pagination table={table} data={data} />}
    </div>
  );
}

function Pagination({
  table,
  data,
}: {
  table: Table<any>;
  data: any[];
}): JSX.Element {
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  // Calculate the range of page numbers to display
  let startPage = Math.max(0, pageIndex - 2);
  let endPage = Math.min(pageCount - 1, startPage + 4); // Show a maximum of 5 pages

  // Adjust start page if at the end of the pagination
  if (endPage - startPage < 4) {
    startPage = Math.max(0, endPage - 4);
  }

  const pagesToShow = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div className="flex w-full flex-row items-center justify-between bg-interface-300 px-4 py-6 dark:bg-dark-interface-300">
      <div>
        Showing{" "}
        <select
          className="rounded bg-interface-100 dark:bg-dark-interface-200"
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
        >
          {[5, 10, 25, 50, data.length]
            .filter((pageSize) => pageSize <= data.length)
            .map((pageSize) => (
              <option
                key={pageSize}
                value={pageSize}
                className="bg-interface-000 dark:bg-dark-interface-000"
              >
                {pageSize}
              </option>
            ))}
        </select>{" "}
        of {data.length} results
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          className="cursor-pointer text-xl transition-colors duration-150 ease-in-out hover:text-text-purple"
          onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {'<<'}
            </button>
        {pagesToShow.map((index) => (
          <button
            key={index}
            className={`flex h-7 w-7 items-center justify-center rounded px-2 py-1 transition duration-200 ease-in-out ${
              index === pageIndex
                ? "bg-interface-100 dark:bg-dark-interface-200"
                : "hover:bg-text-purple/70"
            }`}
            onClick={() => table.setPageIndex(index)}
          >
            {index + 1}
          </button>
        ))}
        <button
          className="cursor-pointer text-xl transition-colors duration-150 ease-in-out hover:text-text-purple"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </button>
      </div>
    </div>
  );
}

