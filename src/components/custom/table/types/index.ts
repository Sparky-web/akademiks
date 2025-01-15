import { ColumnDef } from "@tanstack/react-table";
import { FormApi } from "@tanstack/react-form";
import { Row, RowModel } from "@tanstack/react-table";
import { PaginationState, OnChangeFn } from "@tanstack/react-table";
import { EditableCellProps } from "../editable-cell";
import { ReactNode } from "react";


export type ExtendedColumnDef<T> = ColumnDef<T> & {
    hidden?: boolean;
    headerText?: string;
    editableCell?: EditableCellProps<T>;
    massEditType?: "textarea" | "date";
    width?: number
  };
  
  export type Filter = {
    label: string;
    value: any;
    defaultValue?: any;
    columnKey: string;
  }
  
  export type MassAction<TData> = {
    header: string | React.ReactNode;
    id: string;
    disabled?: ({ selected }: { selected: Row<any>[] }) => any;
    action: (rows: Row<TData>[]) => any;
  }
  
  export interface DataTableProps<TData> {
    columns: ExtendedColumnDef<TData>[];
    data: TData[];
    pageSize?: number;
    defaultSearch?: string;
    controls?: ('header' | 'footer' | 'amountSelected')[],
    size?: 'small' | 'normal',
    hooks?: {
      onRowSelectionChange?: (selectedRows: RowModel<TData>) => any
      onPageChange?: () => any
    },
    pagination?: PaginationState;
    rowCount?: number;
    setPagination?: OnChangeFn<PaginationState>;
    form?: FormApi<any, any>;
    hideControls?: boolean;
    filters?: Filter[],
    massActions?: MassAction<any>[];
    initialState?: any;
    renderSubComponent?: (props: {row: Row<TData>}) => ReactNode;
  }