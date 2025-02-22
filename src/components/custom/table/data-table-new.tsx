'use client'

import { Column, ColumnFiltersState, ColumnSizingState, flexRender, getCoreRowModel, getFacetedRowModel, getFacetedUniqueValues, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, PaginationState, Row, RowModel, SortingState, Updater, useReactTable, VisibilityState } from "@tanstack/react-table";
import { Filter } from "./types";
import { ExtendedColumnDef } from "./types/new";
import { FormApi } from "@tanstack/react-form";
import createTableContext, { TableContext } from "./context";
import React, { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { DataTableProps } from "./types/new";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Table, TableCell, TableBody, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { DataTableColumnHeader } from "./data-column-header-new";
import EditableCell from "./editable-cell-new";
import { cn } from "~/lib/utils";
import DataTableToolbar from "./data-table-toolbar-new";
import DataTableFooter from "./data-table-footer";
import { Checkbox } from "~/components/ui/checkbox";
import DataTableActions from "./data-table-actions";

const defaultOptions: NonNullable<DataTableProps<any>['options']> = {
    header: {
        rowCount: true,
        search: true,
        columnManagement: true,
    },
    footer: {
        rowCount: true,
        pagination: {
            enabled: true,
            pageSize: 10,
        },
    },
    virtualization: {
        enabled: false,
        renderRowCount: 10,
        fixedRowHeight: 48,
    },
    pinning: {
        enabled: false,
        hightlightColor: '#f0f9ff',
    },
    filters: {
        enabled: false,
        defaultFilters: [],
    },
    selectable: {
        enabled: false,
        getRowCanSelect: () => true,
    },
    border: {
        enabled: false,
    },
    editable: {
        enabled: false,
    },
    optionsSaver: {
        enabled: false,
    },
    size: 'base'
};

export interface TablePassedProps {
    useTableContext: TableContext
}

export type SanitizedOptions = Required<NonNullable<DataTableProps<any>['options']>>;


function _DataTable({ useTableContext }: TablePassedProps) {
    const tableContainerRef = useRef(null);
    const { options, data, table } = useTableContext;
    const [showOnlySelected, setShowOnlySelected] = useState(false)
    const _rows = table.getRowModel().rows.filter(row => showOnlySelected ? row.getIsSelected() : true);


    // console.log(table.getAllColumns()[1]?.columnDef.header + "_" + options.virtualization.enabled)

    const rowVirtualizer = useVirtualizer({
        count: _rows.length,
        getScrollElement: () => tableContainerRef.current,
        // estimateSize: () => options.virtualization.fixedRowHeight || 85, // высота строки
        estimateSize: (index) => {
            if (!options.virtualization.dynamicRowHeight?.enabled) return options.virtualization.fixedRowHeight || 85;
            const row = _rows[index]
            if (!row) return options.virtualization.fixedRowHeight || 85;

            return options.virtualization.dynamicRowHeight?.getRowHeight(row) || 85;
        },
        overscan: options.virtualization.renderRowCount || 5,
    })

    return (
        <div className={cn("grid gap-4 ", options.size === 'sm' && 'text-xs')}>
            {(options.header?.rowCount || options.header?.search || options.header?.columnManagement) && <DataTableToolbar useTableContext={useTableContext} setShowOnlySelected={setShowOnlySelected} showOnlySelected={showOnlySelected} />}
            <div className={cn("rounded-xl relative", "!h-[75dvh] overflow-auto bg-card")} ref={tableContainerRef}>
                <Table className={options.virtualization.enabled ? 'table-fixed' : ''}>
                    <TableHeader className="sticky top-[-1px] z-10 shadow-md bg-muted"
                        style={options.virtualization.enabled ? {
                            display: 'inline-flex',
                            width: 'fit-content',
                        } : {}}
                    >
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}
                                className={options.virtualization.enabled ? 'flex w-fit' : ''}
                            >
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead
                                            className={cn(options.size === 'sm' && 'text-xs py-1 px-3', 'relative w-full', options.border?.enabled && 'outline outline-1 outline-slate-100')}
                                            key={header.id}
                                            style={{
                                                width: header.getSize(),
                                                height: '100%',
                                                minHeight: 'fit-content',
                                                display: options.virtualization.enabled ? 'inline-flex' : '',
                                                ...(getCommonPinningStyles(header.column)),
                                            }}
                                        >
                                            {header.isPlaceholder ? null :
                                                <DataTableColumnHeader
                                                    header={header}
                                                    useTableContext={useTableContext}
                                                    column={header.column}
                                                    context={header.getContext()}
                                                />
                                            }
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody
                        style={options.virtualization.enabled ? {
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        } : {}}
                    >
                        {
                            options.virtualization.enabled && <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow, index) => {
                                    const row = _rows[virtualRow.index]

                                    if (!row) return null

                                    return (
                                        <TableRow key={virtualRow.key}
                                            data-index={virtualRow.index}
                                            className={options.pinning.enabled && "inline-flex items-center h-fit"}
                                            ref={rowVirtualizer.measureElement}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    style={{
                                                        minWidth: cell.column.getSize(),
                                                        width: cell.column.getSize(),
                                                        height: !options.pinning.enabled && '100%',
                                                        wordBreak: 'break-word',
                                                        hyphens: 'auto',
                                                        alignSelf: "stretch",
                                                        alignItems: "center",
                                                        alignContent: "center",
                                                        ...getCommonPinningStyles(cell.column)
                                                    }}
                                                    key={cell.id} className={cn(
                                                        options.border?.enabled && 'border-l',
                                                        (cell.column.columnDef as ExtendedColumnDef<any>).options?.editProps?.enabled && 'focus-within:outline-slate-300 outline-1 outline-transparent outline  p-0',
                                                        options.size === 'sm' && 'text-xs  px-3 py-2',
                                                        // '!border'
                                                    )}>
                                                    {
                                                        (
                                                            options.editable?.enabled &&
                                                            (cell.column.columnDef as ExtendedColumnDef<any>).options?.editProps?.enabled &&
                                                            (options.editable?.getRowCanEdit ? options.editable?.getRowCanEdit(row) : true)
                                                        ) ?
                                                            flexRender((cell.column.columnDef as ExtendedColumnDef<any>).options?.editProps?.customCell || EditableCell, { ...cell.getContext(), useTableContext }) :
                                                            flexRender(cell.column.columnDef.cell, { ...cell.getContext(), useTableContext })
                                                    }
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    )
                                })}
                            </div>
                        }

                        {!options.virtualization.enabled && _rows.map((row, index) => {
                            return (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            style={{
                                                minWidth: cell.column.getSize(),
                                                width: cell.column.getSize(),
                                                height: '100%',
                                                wordBreak: 'break-word',
                                                hyphens: 'auto',
                                                ...getCommonPinningStyles(cell.column)
                                            }}
                                            key={cell.id} className={cn((cell.column.columnDef as ExtendedColumnDef<any>).options?.editProps?.enabled && 'focus-within:outline-slate-300 outline-1 outline-transparent outline  p-0')}>
                                            {
                                                (
                                                    options.editable?.enabled &&
                                                    (cell.column.columnDef as ExtendedColumnDef<any>).options?.editProps?.enabled &&
                                                    (options.editable?.getRowCanEdit ? options.editable?.getRowCanEdit(row) : true)
                                                ) ?
                                                    flexRender((cell.column.columnDef as ExtendedColumnDef<any>).options?.editProps?.customCell || EditableCell, { ...cell.getContext(), useTableContext }) :
                                                    flexRender(cell.column.columnDef.cell, { ...cell.getContext(), useTableContext }
                                                    )
                                            }
                                        </TableCell>
                                    ))}
                                </TableRow>
                            )
                        })}

                    </TableBody>
                </Table>
            </div>
            <DataTableFooter useTableContext={useTableContext} />
        </div >
    )
}

function __DataTable(props: DataTableProps<any>) {
    // const optionsMerged = useMemo(() => mergeDeepObjects(defaultOptions, props.options || {}) as SanitizedOptions, []);

    const optionsMerged = useMemo(() => {
        return ({
            ...defaultOptions,
            ...props.options,
        } as SanitizedOptions)
    }, [props.options])

    // const { useTableContext, TableProvider } = useMemo(() => createTableContext(), []);

    const columnsTransposed: ExtendedColumnDef<any>[] = useMemo(() => {
        const cols: ExtendedColumnDef<any>[] = props.columns.map(e => ({
            filterFn: (row: Row<any>, columnId: string, filterValue: string | string[]) => {
                const column = table.getColumn(columnId)
                if (!column) return true;

                const columnDef = column.columnDef as ExtendedColumnDef<any>

                if (columnDef.options?.filters?.array?.enabled && Array.isArray(filterValue)) {
                    const values = row.getValue(columnId).map(e => columnDef.options?.filters?.array.getFilterValue(e).toString())
                    if (!values.length) return filterValue.includes('Не указан')
                    return values.some(e => filterValue.includes(e))
                }
                const value = column.columnDef.options?.filters?.getFilterValue ? column.columnDef.options?.filters?.getFilterValue(row) :
                    column.columnDef.accessorFn ? column.columnDef.accessorFn(row.original) : row.original[column.id];


                return filterValue.includes(value);
            },
            ...e,
        }))

        if (props.options?.selectable?.enabled) {
            cols.unshift({
                accessorKey: "select",
                size: 50,
                header: ({ table }) => (
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")}
                        onCheckedChange={(value: any) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all" />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row" />
                ),
                enableHiding: false,
                options: {
                    pinning: {
                        enabled: cols[0]?.options?.pinning?.enabled || false,
                    }
                }
            })
        }

        if (props.options?.actions?.enabled) {
            cols.push({
                accessorKey: "actions", header: "",
                cell: ({ row }) => {
                    return <DataTableActions rows={[row]} useTableContext={useTableContext} />
                },
                enableHiding: false,
            })
        }

        return cols;
    }, [props.columns])


    const { options, columns, data, hooks } = {
        ...props,
        options: optionsMerged,
        columns: columnsTransposed
    }

    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
        {
            ...columns.reduce((acc, col) => {
                // @ts-ignore
                acc[col.accessorKey] = col.size;
                return acc;
            }, {}),
        });


    const [rowSelection, setRowSelection] = useState({});
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(

        {
            ...columns.reduce((acc, col) => {
                // @ts-ignore
                acc[col.accessorKey] = !col.hidden;
                return acc;
            }, {}),
        });

    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
        options.filters?.enabled ? options.filters.defaultFilters || [] : []
    );

    const [sorting, setSorting] = useState<SortingState>([]);

    const [pagination, setPagination] = useState<PaginationState>(
        options.footer.pagination?.enabled ? {
            pageSize: options.footer.pagination.pageSize || 10,
            pageIndex: 0,
        } : {
            pageSize: data.length,
            pageIndex: 0,
        }
    )

    const table = useReactTable({
        data,
        columns,
        // initialState: {
        //   columnFilters: options.filters.enabled ? options.filters.defaultFilters || [] : []
        // },

        rowCount: options.footer.serverPagination?.enabled ? options.footer.serverPagination.rowCount : data.length,
        state: {
            sorting,
            columnVisibility: (options.optionsSaver?.enabled ? settings?.visibility : null) || columnVisibility,
            rowSelection,
            columnFilters,
            columnSizing: (options.optionsSaver?.enabled ? settings?.sizing : null) || columnSizing,
            // pagination: options.footer.serverPagination?.enabled ? options.footer.serverPagination.state : pagination,
            pagination: options.footer.pagination?.enabled ? pagination
                : options.footer.serverPagination?.enabled ? options.footer.serverPagination.state
                    : { pageSize: data.length, pageIndex: 0 }
        },
        onRowSelectionChange: (selectedRows) => {
            setRowSelection(selectedRows)

            if (props.hooks?.onRowSelectionChange) {
                console.log(selectedRows)
            }
        },
        onSortingChange: options.serverSorting?.enabled ? options.serverSorting.onSortingChange : setSorting,
        ...(options.serverSorting?.enabled && { manualSorting: true }),
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: options.footer.serverPagination?.enabled ? options.footer.serverPagination.onPaginationChange : setPagination,
        onColumnSizingChange: setColumnSizing,
        manualPagination: options.footer.serverPagination?.enabled,

        enableRowSelection: options.selectable.enabled ? row => typeof row.original.isSelectable === 'undefined' ? true : row.original.isSelectable : false,
        enableColumnPinning: options.pinning.enabled,
        enableRowPinning: options.pinning.enabled,

        // columnResizeMode: 'onChange',
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        // getRowCanExpand: () => renderSubComponent !== undefined,

        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    });


    useEffect(() => {
        if (props.setTable) {
            props.setTable(table)
        }
    }, [table])

    useEffect(() => {
        if (hooks?.onRowSelectionChange) hooks.onRowSelectionChange(table.getSelectedRowModel().rows)
        // console.log(table.getSelectedRowModel().rows
    }, [rowSelection])

    // useEffect(() => {
    //     // if (props.options?.filters?.enabled && props.options?.filters?.defaultFilters?.length) {
    //     //     table.getAllColumns().forEach(column => {

    //     //         if (props.options?.filters?.defaultFilters?.find(e => e.id === column.id)) {
    //     //             column.setFilterValue(props.options?.filters?.defaultFilters?.find(e => e.id === column.id)?.value)
    //     //         }
    //     //     })
    //     // }
    // }, [])

    const useTableContext = useMemo(() => ({ ...props, options: optionsMerged, table }), []);

    return (
        <_DataTable useTableContext={useTableContext} />
    )
}
export default __DataTable

const getCommonPinningStyles = (column: Column<any>): CSSProperties => {
    const isPinned = (column.columnDef as ExtendedColumnDef<any>).options?.pinning?.enabled;

    if (!isPinned) return {};

    return {
        left: isPinned ? `${column.getStart()}px` : undefined,
        background: isPinned ? '#fbfbfb' : 'transparent',
        display: isPinned ? 'inline-flex' : 'initial',
        alignSelf: "stretch",
        alignItems: "center",
        position: isPinned ? 'sticky' : 'relative',
        zIndex: isPinned ? 1 : 0,
    }
}
