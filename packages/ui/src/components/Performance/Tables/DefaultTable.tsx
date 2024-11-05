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
import { ReactNode, useState } from "react";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import BorderAllIcon from "@mui/icons-material/BorderAll";
import { Switch } from "@headlessui/react";

export default function DefalutTable<T>({
  title,
  data,
  getColumns,
  pagination = false,
  chartComponent = null,
  searchable = false,
}: {
  title: string;
  data: T[];
  getColumns: () => ColumnDef<T, any>[];
  pagination?: boolean;
  chartComponent?: ReactNode;
  searchable?: boolean;
}): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [displayChart, setDisplayChart] = useState<boolean>(false);

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
      <div className="flex items-center justify-between bg-interface-100 px-4 py-5 dark:bg-dark-interface-100">
        {chartComponent && (
          <DisplayChartSwitch
            displayChart={displayChart}
            setDisplayChart={setDisplayChart}
          />
        )}
        <div className="flex flex-1 justify-center text-2xl">{title}</div>
        {searchable && <div>Search</div>}
      </div>
     {displayChart &&  chartComponent ? chartComponent : <table className="w-full table-auto border-collapse border-spacing-8">
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
      </table>}
      {pagination && <Pagination table={table} data={data} />}
    </div>
  );
}

function DisplayChartSwitch({
  displayChart,
  setDisplayChart,
}: {
  displayChart: boolean;
  setDisplayChart: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div
      className="relative inline-flex items-center rounded bg-interface-300 dark:bg-dark-interface-300"
      onClick={() => {
        setDisplayChart(!displayChart);
      }}
    >
      {/* bg pill toggling from one side to the other */}
      <div
        className={`absolute bottom-0 top-0 w-1/2 rounded bg-text-purple py-1 transition-transform duration-300 ${
          displayChart ? "translate-x-full" : "translate-x-0"
        }`}
      ></div>

      <span
        className={`relative z-10 flex w-1/2 cursor-pointer items-center justify-center transition-colors duration-300 p-1 ${
          !displayChart && "text-white dark:text-black"
        }`}
      >
        <BorderAllIcon style={{ fontSize: "20px" }} />
      </span>

      <span
        className={`relative z-10 flex w-1/2 cursor-pointer items-center justify-center transition-colors duration-300 p-1 ${
          displayChart && "text-white dark:text-black"
        }`}
      >
        <EqualizerIcon style={{ fontSize: "20px" }} />
      </span>
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

  const pagesToShow = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i,
  );

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
          {"<<"}
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
          {">>"}
        </button>
      </div>
    </div>
  );
}
