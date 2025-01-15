import {
    ArrowDownIcon,
    ArrowUpIcon,
    EyeIcon,
    ChevronsUpDown,
    FilterIcon,
    CheckIcon,
} from "lucide-react";

import { ExtendedColumnDef } from "./types/new";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Column, flexRender, Header, HeaderContext, HeaderGroup } from "@tanstack/react-table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import MassEditTextarea from "./mass-edit-textarea-new";
import { TablePassedProps } from "./data-table-new";
import ErrorBoundary from "~/app/_lib/utils/error-boundary";

interface ExtendedColumn<T, TValue> extends Column<T> {
    columnDef: ExtendedColumnDef<T>;
}

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement>, TablePassedProps {
    column: ExtendedColumn<TData, TValue>;
    header: Header<TData, TValue>;
    context: HeaderContext<TData, TValue>;
}

function getColumnFilters(column: ExtendedColumn<any, unknown>) {
    const isEnabled = column.columnDef.options?.filters?.enabled;
    if (!isEnabled) return [];

    const rows = Array.from(column.getFacetedRowModel().rows.values());

    let filters: { [key: string]: { name: string | null, count: number } } = {};
    for (const row of rows) {
        const _filters: {
            value: string,
            label: string | null
        }[] = []

        if (column.columnDef.options?.filters?.array?.enabled) {
            for (const value of row.getValue(column.columnDef.accessorKey) as string[]) {
                const label = column.columnDef.options?.filters?.array?.getFilterLabel ? column.columnDef.options?.filters?.array?.getFilterLabel(value) : null;
                const _value = column.columnDef.options?.filters?.array?.getFilterValue ? column.columnDef.options?.filters?.array?.getFilterValue(value) : value;

                _filters.push({
                    value: _value,
                    label
                })
            }
            if (!row.getValue(column.columnDef.accessorKey).length) _filters.push({
                value: 'Не указан'
            })

        } else {
            const value = column.columnDef.options?.filters?.getFilterValue ? column.columnDef.options?.filters?.getFilterValue(row) :
                column.columnDef.accessorFn ? column.columnDef.accessorFn(row.original) : row.original[column.columnDef.accessorKey];
            const label = column.columnDef.options?.filters?.getFilterLabel ? column.columnDef.options?.filters?.getFilterLabel(row) : null;

            _filters.push({
                value,
                label
            })
        }


        for (const { label, value } of _filters) {
            if (filters[value] !== undefined) {
                filters[value].count += 1;
            }

            else {
                filters[value] = {
                    name: label,
                    count: 1
                }
            }
        }
    }

    const resultArr = Object.entries(filters).map(([value, { count, name }], index) => ({
        name,
        value,
        count
    }));

    return resultArr;
}

export function DataTableColumnHeader<TData, TValue>({
    column,
    useTableContext,
    context,
    header,
    className,
}: DataTableColumnHeaderProps<TData, TValue>) {
    const { table, options } = useTableContext

    const selectedRows = table.getSelectedRowModel()
    const title = column.columnDef.header

    const filters = options?.filters?.enabled ? getColumnFilters(column) : [];
    const selectedValues = new Set(column?.getFilterValue() as (string | number)[])


    return (
        <div className="grid gap-2 h-full py-2 ">
            <div className={cn("flex gap-1 content-center items-center", className)}>
                {typeof title === 'string' ? title : flexRender(title, context)}

                {column.columnDef.enableSorting && <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className=" h-8 p-0 data-[state=open]:bg-accent"
                        >
                            {column.getIsSorted() === "desc" ? (
                                <ArrowDownIcon className={cn("h-4 w-4 ", options.size === 'sm' && 'h-3 w-3')} />
                            ) : column.getIsSorted() === "asc" ? (
                                <ArrowUpIcon className={cn("h-4 w-4 ", options.size === 'sm' && 'h-3 w-3')} />
                            ) : (
                                <ChevronsUpDown className={cn("h-4 w-4 ", options.size === 'sm' && 'h-4 w-4')} />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className={cn("text-sm", options.size === 'sm' && '!text-xs')}>
                        <DropdownMenuItem onClick={() => column.toggleSorting(false)} className={cn("text-sm", options.size === 'sm' && 'text-xs')}>
                            <ArrowUpIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                            По возрастанию
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => column.toggleSorting(true)} className={cn("text-sm", options.size === 'sm' && 'text-xs')}>
                            <ArrowDownIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                            По убыванию
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => column.toggleVisibility(false)} className={cn("text-sm", options.size === 'sm' && 'text-xs')}>
                            <EyeIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                            Спрятать
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>}



                {!!filters.length && <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            // disabled={!items}
                            // ref={ref}
                            variant="ghost"
                            role="combobox"
                            // aria-expanded={open}
                            className=" h-8 p-1 "
                        >
                            <FilterIcon className={cn("h-4 w-4 ", options.size === 'sm' && 'h-3 w-3')} />
                            {/* <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /> */}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent
                        className={cn(" p-0 w-[275px] ", options.size === 'sm' && 'text-xs')}
                    // style={{ width: ref.current?.offsetWidth }}
                    >
                        <ErrorBoundary>

                            <Command
                                filter={(value, search) => {
                                    if (value.toLowerCase().includes(search.toLowerCase())) return 1
                                    return 0
                                }}
                            >
                                <CommandInput placeholder="Поиск" className="h-9" />
                                <CommandEmpty>Не найдено</CommandEmpty>
                                <ScrollArea className="h-[400px] overflow-auto">
                                    <div className="flex items-center content-center px-2 py-2 hover:bg-slate-100 rounded-sm mx-1 cursor-pointer"
                                        onClick={() => {
                                            if (selectedValues.size === filters.length) {
                                                selectedValues.clear()
                                            }
                                            else {
                                                for (const item of filters) {
                                                    selectedValues.add(item.value)
                                                }
                                            }

                                            const filterValues = Array.from(selectedValues)
                                            column?.setFilterValue(
                                                filterValues.length ? filterValues : undefined
                                            )
                                        }}
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                filters.length === selectedValues.size
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <CheckIcon className={cn("h-4 w-4")} />
                                        </div>
                                        {/* {option.icon && (
                                            <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        )} */}
                                        <div className="grid gap-1">
                                            <span className={cn("text-sm font-semibold", options.size === 'sm' && 'text-xs')}>Выбрать все</span>
                                        </div>
                                    </div>

                                    <CommandGroup>
                                        {filters.map(item => {
                                            const isSelected = selectedValues.has(item.value)
                                            return (
                                                <CommandItem key={item.value}
                                                    className="content-center items-center flex justify-between gap-3"
                                                    value={item.value.replace(/"/g, '') + item?.name?.replace(/"/g, '')}
                                                    onSelect={() => {
                                                        if (isSelected) {
                                                            selectedValues.delete(item.value)
                                                        } else {
                                                            selectedValues.add(item.value)
                                                        }
                                                        const filterValues = Array.from(selectedValues)
                                                        column?.setFilterValue(
                                                            filterValues.length ? filterValues : undefined
                                                        )
                                                    }}
                                                >
                                                    <div className="flex items-center content-center">
                                                        <div
                                                            className={cn(
                                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                                isSelected
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "opacity-50 [&_svg]:invisible"
                                                            )}
                                                        >
                                                            <CheckIcon className={cn("h-4 w-4")} />
                                                        </div>
                                                        {/* {option.icon && (
                                            <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        )} */}
                                                        <div className="grid gap-1 break-all hyphens-auto max-w-full">
                                                            <span className={cn("text-sm", options.size === 'sm' && 'text-xs')}>{item.name || item.value}</span>
                                                            {item.name && <span className="text-xs text-muted-foreground">{item.value}</span>}
                                                        </div>
                                                    </div>

                                                    <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs mr-2">
                                                        {item.count}
                                                    </span>
                                                </CommandItem>
                                            )
                                        })}
                                    </CommandGroup>
                                </ScrollArea>
                            </Command>

                        </ErrorBoundary>
                    </PopoverContent>
                </Popover>}
            </div>
            {
                options.editable.enabled &&
                column.columnDef.options?.editProps?.enabled &&
                selectedRows.rows?.length > 0 &&
                <MassEditTextarea header={column} useTableContext={useTableContext} />
            }
            {/* {column} */}

            <div
                {...{
                    onDoubleClick: () => column.resetSize(),
                    onMouseDown: header.getResizeHandler(),
                    onTouchStart: header.getResizeHandler(),
                    className: `resizer ${table.options.columnResizeDirection
                        } ${header.column.getIsResizing() ? 'isResizing' : ''
                        }`,
                    style: {
                        transform:
                                header.column.getIsResizing()
                                ? `translateX(${(table.options.columnResizeDirection ===
                                    'rtl'
                                    ? -1
                                    : 1) *
                                (table.getState().columnSizingInfo
                                    .deltaOffset ?? 0)
                                }px)`
                                : '',
                    },
                }}
            />
        </div>
    );
}
