'use client';

import { DecorateRouterRecord } from "@trpc/react-query/shared";
import { DataTableProps, ExtendedColumnDef } from "../table/types/new";
import { api } from "~/trpc/react";
import { useEffect, useState } from "react";
import DataTable from "../table/data-table-new";
import { keepPreviousData } from "@tanstack/react-query";
import { SortingState } from "@tanstack/react-table";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "~/components/ui/select";
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

const operators = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'IN', 'NOT IN', 'IS', 'IS NOT']

interface FilterFormProps {
    filters: TableFilter,
}

interface DbTableProps<T> {
    sql: string;
    table: string;
    key: string;
    filters?: {
        enabled: boolean,
    },
    includes?: string[],
    updatableColumns?: {
        type: 'text' | 'number' | 'date' | 'boolean' | 'select',
        selectOptions?: {
            label: string,
            value: string,
        }[],
        key: string,
        title: string,
    }[],
    columns?: ExtendedColumnDef<T>[];
    options?: DataTableProps<T>['options'];
}

export default function DbTable<T>({ sql, columns, options, includes, ...props }: DbTableProps<T>) {
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 20,
    })

    const [sortingState, setSortingState] = useState<SortingState>([])

    const form = useForm<FilterFormProps>({
        defaultValues: {
            filters: []
        },
        validatorAdapter: zodValidator(),
        onSubmit: async ({ value }) => {
            setFilters(value.filters)
        }
    })

    const { data: columnsSchema } = api.table.getColumns.useQuery({ table: props.table })

    const [filters, setFilters] = useState<TableFilter>([])

    const { data, isPending, isFetching, isLoading, error } = api.table.get.useQuery({
        sql,
        start: pagination.pageIndex * pagination.pageSize,
        limit: pagination.pageSize,
        orderBy: sortingState[0]?.id || '',
        filters,
        orderDirection: sortingState[0]?.desc ? 'desc' : 'asc',
    }, {
        placeholderData: keepPreviousData,
        retry(failureCount, error) {
            return false;
        },
    })

    useEffect(() => {
        if (error) {
            toast.error(error.message)
        }
    }, [error])


    if (!columns && data && columnsSchema && data.rows?.[0]) {
        columns = Object.keys(data.rows?.[0]).map(e => ({
            accessorKey: e,
            header: columnsSchema.find(el => e === el.title)?.description || e,
            enableSorting: true,
            cell: ({ cell }) => (
                // <Tooltip title={cell.getValue()}>
                <span className="line-clamp-3">{cell.getValue()}</span>
                // </Tooltip>
            )
        }))
    }

    // console.log(isPending, isFetching, isLoading, error)

    return (
        <div className="grid gap-4 relative">
            {/* 
            {!data && !error && isFetching && <div className="flex justify-center gap-2 content-center">
                <Loader />
            </div>} */}

            {(isFetching || !columns) &&
                <div className="w-full h-full flex justify-center items-center absolute top-0 left-0 z-10 ">
                    <div className="relative inline-flex">
                        <div className="w-10 h-10 bg-primary/60 rounded-full"></div>
                        <div className="w-10 h-10 bg-primary/60 rounded-full absolute top-0 left-0 animate-ping"></div>
                        <div className="w-10 h-10 bg-primary/60 rounded-full absolute top-0 left-0 animate-pulse"></div>
                    </div>
                </div>
            }

            {columnsSchema && props.filters?.enabled &&
                <form className="grid gap-3" onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                }}>
                    <H3>Фильтр</H3>

                    <form.Field name="filters">
                        {(field) => (
                            <div className="grid gap-2">
                                {field.state.value.map((_, i) => {
                                    return (
                                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3">
                                            <form.Field name={`filters[${i}].columnKey`} validators={{
                                                onChange: z.string().min(1, 'Обязательное поле')
                                            }}>
                                                {(field) => (
                                                    <FormSelectField options={columns?.map(e => ({
                                                        label: (e.header || e.accessorKey) +
                                                            (e.header ? ` (${e.accessorKey})` : '')
                                                        , value: e.accessorKey
                                                    })) || []} field={field} inputProps={{ placeholder: 'Выберите колонку' }} />
                                                )}
                                            </form.Field>
                                            <form.Field name={`filters[${i}].operator`}
                                                validators={{
                                                    onChange: z.string().min(1, 'Обязательное поле')
                                                }}
                                            >
                                                {(field) => (
                                                    <FormSelectField options={operators.map(e => ({ label: e, value: e }))} field={field} inputProps={{ placeholder: 'Выберите оператор' }} />
                                                )}
                                            </form.Field>
                                            <form.Field name={`filters[${i}].value`}>
                                                {(field) => (
                                                    <FormTextField field={field} inputProps={{ placeholder: 'Введите значение' }} />
                                                )}
                                            </form.Field>
                                            <Button variant="ghost" className="w-fit" onClick={() => field.removeValue(i)}>
                                                <X className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    )
                                })}
                                <Button variant="secondary" size="sm" className="w-fit" type="button" onClick={() => field.pushValue({ columnKey: '', operator: '', value: '' })}>
                                    <Plus className="h-4 w-4" />
                                    добавить фильтр
                                </Button>
                            </div>
                        )}
                    </form.Field>

                    <form.Subscribe
                        selector={(state) => [state.canSubmit, state.isSubmitting, isFetching]}
                    >
                        {([canSubmit, isSubmitting, isFetching]) => (
                            <Button variant="default" size="sm" className="w-fit" type="submit" disabled={!canSubmit || isSubmitting}>
                                {isFetching && <LoaderIcon className="w-4 h-4 animate-spin" />}
                                применить
                            </Button>
                        )}
                    </form.Subscribe>

                    {/* <div className="grid grid-cols-3 gap-3">
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите колонку" />
                            </SelectTrigger>
                            <SelectContent>
                                {columns.map(column => (
                                    <SelectItem key={column.accessorKey} value={column.accessorKey}>
                                        {column.header}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Выберите оператор" />
                            </SelectTrigger>
                            <SelectContent>
                                {operators.map(operator => (
                                    <SelectItem key={operator} value={operator}>
                                        {operator}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input placeholder="Введите значение" />
                    </div> */}

                </form>}
            {/* <div className="w-full overflow-x-auto"> */}
            {data && columns && <DataTable
                columns={columns}
                data={data.rows}
                options={{
                    ...options,
                    size: 'sm',
                    serverSorting: {
                        enabled: true,
                        onSortingChange: setSortingState,
                        state: sortingState,
                    },
                    footer: {
                        serverPagination: {
                            enabled: true,
                            state: pagination,
                            onPaginationChange: setPagination,
                            rowCount: data.count,
                            isPending: isFetching,
                        },
                    }
                }}
            />}
            {/* </div> */}
            <div className="h-10"></div>
        </div>
    )

}

// const { data, isLoading, error } = controller.get.useQuery()
