import { CellContext, ColumnDef, ColumnFiltersState, HeaderContext, PaginationState, Row, RowModel, SortingState, Table, Updater } from "@tanstack/react-table";
// import { ExtendedColumnDef } from "";
import { FormApi } from "@tanstack/react-form";
import { ActionsApi } from "~/app/pz/[pzId]/_lib/components/actions";
import { ReactNode, Ref } from "react";
import { isArray } from "lodash";

export interface DataTableProps<TData> {
    name?: string,
    columns: ExtendedColumnDef<TData>[],
    data?: TData[],
    setTable: (table: Table<TData>) => void,
    options?: {
        size?: 'sm' | 'base',
        header?: {
            rowCount?: boolean,
            search?: boolean,
            columnManagement?: boolean,
            showOnlySelected?: boolean,
        },
        footer?: {
            rowCount?: boolean,
            pagination?: {
                enabled: boolean,
                pageSize?: number
            },
            serverPagination?: {
                enabled: boolean,
                state: PaginationState,
                rowCount: number,
                isPending: boolean,
                onPaginationChange?: (pagination: Updater<PaginationState>) => void,
            }
        },
        virtualization?: {
            enabled: boolean,
            renderRowCount?: number,
            fixedRowHeight?: number,
            dynamicRowHeight?: {
                enabled: boolean,
                getRowHeight: (row: Row<TData>) => number,
            }
        },
        pinning?: {
            enabled: boolean,
            hightlightColor?: string,
        },
        editable?: {
            enabled: boolean,
            form: FormApi<any, any>,
            getRowCanEdit?: (row: Row<TData>) => boolean,
        },
        serverSorting?: {
            enabled: boolean,
            state: SortingState,
            onSortingChange?: (sorting: SortingState) => void,
        },
        selectable?: {
            enabled: boolean,
            getRowCanSelect: (row: Row<TData>) => boolean,
        },
        actions?: {
            enabled: boolean,
            actionsArray: ActionsApi['actionsArray'],
        },
        filters?: {
            enabled: boolean,
            defaultFilters?: ColumnFiltersState,
        },
        border?: {
            enabled: boolean,
        },
        optionsSaver?: {
            enabled: boolean,
            id: string,
        },
    },
    hooks?: {
        onRowSelectionChange?: (selectedRows: Row<TData>[]) => any,
    },
}

export type ExtendedColumnDef<T> = ColumnDef<T> & {
    accessorKey: string,
    options?: {
        filters?: {
            enabled: boolean,
            array?: {
                enabled: boolean,
                getFilterValue?: (el: any) => string,
                getFilterLabel?: (el: any) => string,
            },
            getFilterValue?: (row: Row<T>) => string,
            getFilterLabel?: (row: Row<T>) => string,
        }
        isSelectable?: boolean,
        href?: string,
        pinning?: {
            enabled: boolean,
        }
        hidden?: boolean;
        dynamicHeight?: boolean,
        editProps?: {
            enabled: boolean,
            validator?: (value: any) => any,
            customCell?: (props: CellContext<T, unknown>) => ReactNode,
            enableMassEdit?: boolean,
            customMassEditCell?: (props: HeaderContext<T, unknown>) => ReactNode,
        }
    }
};
