import { z } from "~/lib/utils/zod-russian";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { Prisma, PrismaClient } from "@prisma/client";
import { includes } from "lodash";

const prisma = new PrismaClient();

export interface Column {
    title: string;
    data_type: string;
    description: string;
}

const filtersSchema = z.array(z.object({
    columnKey: z.string(),
    operator: z.enum(["=", "!=", ">", "<", ">=", "<=", 'NOT LIKE', 'IN', 'NOT IN', 'IS', 'IS NOT']),
    value: z.string(),
}));

export type TableFilter = z.infer<typeof filtersSchema>;

export default createTRPCRouter({
    get: publicProcedure.input(z.object({
        sql: z.string(),
        start: z.number().optional(),
        limit: z.number().optional(),
        orderBy: z.string().optional(),
        orderDirection: z.enum(["asc", "desc"]).optional().default("asc"),
        filters: filtersSchema.optional().default([]),
    })).query(async ({ input, ctx: { db } }) => {
        const { sql, start, limit, orderBy, filters, orderDirection } = input;

        let filtersSql = ''

        if (filters) {
            filtersSql = filters.map(filter => {
                const { columnKey, operator, value } = filter;
                return `${columnKey} ${operator} '${value}'`;
            }).join(' and ');
        }

        const rows = await db.$queryRawUnsafe(`
            select * from (${sql}) as t
            ${filtersSql ? `where ${filtersSql}` : ''}
            ${orderBy ? `order by "${orderBy}" ${orderDirection}` : ''}
            ${limit ? `limit ${limit}` : ''}
            ${start ? `offset ${start}` : ''}
        `);

        const count = await db.$queryRawUnsafe(`
            select count(*) as c  from (${sql}) as t
            ${filtersSql ? `where ${filtersSql}` : ''}
        `);

        return { rows, count: +count[0].c.toString() };
    }),

    getColumns: publicProcedure.input(z.object({
        table: z.string(),
    })).query(async ({ input, ctx: { db } }) => {
        const tableName = input.table;

        const columns = await db.$queryRawUnsafe(`
            PRAGMA table_info("${tableName}");
        `);

        return columns.map((column: any) => ({
            title: column.name,
            data_type: column.type,
        }));
    }),

    getOne: publicProcedure.input(z.object({
        model: z.string(),
        key: z.string(),
        value: z.any(),
    })).query(async ({ input }) => {
        const { model, key, value } = input;
        const row = await prisma[model].findUnique({ where: { [key]: value } });
        return row;
    }),

    delete: publicProcedure.input(z.object({
        model: z.string(),
        key: z.string(),
        value: z.any(),
    })).mutation(async ({ input }) => {
        const { model, key, value } = input;
        await prisma[model].delete({ where: { [key]: value } });
    }),

    create: publicProcedure.input(z.object({
        model: z.string(),
        data: z.object({}).passthrough(),
    })).mutation(async ({ input }) => {
        const { model, data } = input;
        const created = await prisma[model].create({ data });
        return created;
    }),

    update: publicProcedure.input(z.object({
        model: z.string(),
        data: z.object({}).passthrough(),
        key: z.string(),
        value: z.any(),
    })).mutation(async ({ input }) => {
        const { model, data, key, value } = input;
        const updated = await prisma[model].update({
            where: { [key]: value },
            data,
        });
        return updated;
    }),
});
