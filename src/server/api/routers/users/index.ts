import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { db } from '~/server/db';


const filtersSchema = z.array(z.object({
    columnKey: z.string(),
    operator: z.enum(["=", "!=", ">", "<", ">=", "<=", "like", "startsWith", "endsWith"]),
    value: z.string(),
}));

export default createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        start: z.number().int().nonnegative(),
        limit: z.number().int().positive(),
        filters: filtersSchema.optional().default([]).nullable(),
        orderBy: z.string().optional().nullable(),
        orderDirection: z.enum(["asc", "desc"]).optional().default("asc").nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.isAdmin) throw new Error('Доступ запрещен');

      const { start, limit, orderDirection, orderBy, filters } = input;

      // Подготовка объекта сортировки

      // Получение пользователей с пагинацией и сортировкой
      // const users = await db.user.findMany({
      //   skip: start,
      //   take: limit,
      //   orderBy,
      //   include: {
      //     Group: true,
      //     Teacher: true,
      //   },
      // });

      let filtersSql = ''

      if (filters) {
        filtersSql = filters.map(filter => {
          const { columnKey, operator, value } = filter;
          return `${columnKey} ${operator} '${value}'`;
        }).join(' and ');
      }

      const users = await db.$queryRawUnsafe(`
        select u.id, u.role, u.name, u.email, u.isAdmin, t.name as teacherName, g.title as groupTitle, u.isNotificationsEnabled, count(ps.id) as enabledNotificationsCount from "User" u 
      left join PushSubscription ps on ps.userId = u.id 
      left join Teacher t on t.id = u.teacherId 
      left join "Group" g on g.id = u.groupId 
      where 1=1 ${filtersSql ? `and ${filtersSql}` : ''}
      group by u.id
      ${orderBy ? `order by ${orderBy} ${orderDirection}` : ''}
      ${limit ? `limit ${limit}` : ''}
      ${start ? `offset ${start}` : ''}
      `)

      // Подсчет общего количества пользователей
      const totalCount = await db.user.count();

      // Удаление пароля из результатов
      const sanitizedUsers = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return {
        users: sanitizedUsers,
        totalCount,
      };
    }),
  summary: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.isAdmin) throw new Error('Доступ запрещен');

    const groupSummary = await db.user.groupBy({
      by: ['groupId'],
      _count: {
        _all: true,
      },
    });

    const groups = await db.group.findMany({
      orderBy: {
        title: 'asc',
      },
    });

    const totalCount = groupSummary.reduce((acc, group) => acc + group._count._all, 0);

    const items = groupSummary.map(group => {
      const groupInfo = groups.find(g => g.id === group.groupId);
      return {
        title: groupInfo?.title || 'Без группы',
        count: group._count._all,
      };
    });

    return {
      count: totalCount,
      items,
    };
  }),
});