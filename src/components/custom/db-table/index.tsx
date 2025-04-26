"use client";

import { DecorateRouterRecord } from "@trpc/react-query/shared";
import { DataTableProps, ExtendedColumnDef } from "../table/types/new";
import { api } from "~/trpc/react";
import { useEffect, useState } from "react";
import DataTable from "../table/data-table-new";
import { keepPreviousData } from "@tanstack/react-query";
import { SortingState } from "@tanstack/react-table";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { H3 } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { TableFilter } from "~/server/api/routers/table/index";
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { FormSelectField } from "../selectors/form-select-field";
import { FormTextField } from "../selectors/form-text-field";
import { LoaderIcon, Plus, Search, X } from "lucide-react";
import { z } from "~/lib/utils/zod-russian";
import { toast } from "sonner";

const operators = [
  "=",
  "!=",
  ">",
  "<",
  ">=",
  "<=",
  "LIKE",
  "NOT LIKE",
  "IN",
  "NOT IN",
  "IS",
  "IS NOT",
];

interface FilterFormProps {
  filters: TableFilter;
}

interface DbTableProps<T> {
  sql: string;
  table: string;
  key: string;
  filters?: {
    enabled: boolean;
  };
  includes?: string[];
  updatableColumns?: {
    type: "text" | "number" | "date" | "boolean" | "select";
    selectOptions?: {
      label: string;
      value: string;
    }[];
    key: string;
    title: string;
  }[];
  columns?: ExtendedColumnDef<T>[];
  options?: DataTableProps<T>["options"];
}

export default function DbTable<T>({
  sql,
  columns,
  options,
  includes,
  ...props
}: DbTableProps<T>) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 5000,
  });

  const [sortingState, setSortingState] = useState<SortingState>([]);

  const form = useForm<FilterFormProps>({
    defaultValues: {
      filters: [],
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      setFilters(value.filters);
    },
  });

  const [filters, setFilters] = useState<TableFilter>([]);

  const { data, isPending, isFetching, isLoading, error } =
    api.table.get.useQuery(
      {
        sql,
        start: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        orderBy: sortingState[0]?.id || "",
        filters,
        orderDirection: sortingState[0]?.desc ? "desc" : "asc",
      },
      {
        placeholderData: keepPreviousData,
        retry(failureCount, error) {
          return false;
        },
      },
    );

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  //   if (!columns && data && columnsSchema && data.rows?.[0]) {
  //     columns = Object.keys(data.rows?.[0]).map((e) => ({
  //       accessorKey: e,
  //       header: columnsSchema.find((el) => e === el.title)?.description || e,
  //       enableSorting: true,
  //       cell: ({ cell }) => (
  //         // <Tooltip title={cell.getValue()}>
  //         <span className="line-clamp-3">{cell.getValue()}</span>
  //         // </Tooltip>
  //       ),
  //     }));
  //   }

  // console.log(isPending, isFetching, isLoading, error)

  return (
    <div className="relative grid gap-4">
      {/* 
            {!data && !error && isFetching && <div className="flex justify-center gap-2 content-center">
                <Loader />
            </div>} */}

      {(isFetching || !columns) && (
        <div className="absolute top-0 left-0 z-10 flex h-full w-full items-center justify-center">
          <div className="relative inline-flex">
            <div className="bg-primary/60 h-10 w-10 rounded-full"></div>
            <div className="bg-primary/60 absolute top-0 left-0 h-10 w-10 animate-ping rounded-full"></div>
            <div className="bg-primary/60 absolute top-0 left-0 h-10 w-10 animate-pulse rounded-full"></div>
          </div>
        </div>
      )}

      {data && columns && (
        <DataTable
          columns={columns}
          data={data.rows}
          options={{
            ...options,
            size: "sm",
            serverSorting: {
              enabled: true,
              onSortingChange: setSortingState,
              state: sortingState,
            },
            footer: {
              //   serverPagination: {
              //     enabled: true,
              //     state: pagination,
              //     onPaginationChange: setPagination,
              //     rowCount: data.count,
              //     isPending: isFetching,
              //   },
            },
          }}
        />
      )}
      {/* </div> */}
      <div className="h-10"></div>
    </div>
  );
}

// const { data, isLoading, error } = controller.get.useQuery()
