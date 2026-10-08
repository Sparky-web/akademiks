import { env } from "~/env";
import { db } from "~/server/db";

import updateSchedule, {
  ResultItem,
  UpdateReport,
} from "~/server/api/routers/schedule/_lib/utils/update-schedule";
import {
  deleteMissingRgsuGroup,
  parseRgsuGroups,
  refreshRgsuGroupAdditionalId,
} from "./rgsu/parse-groups";
import { rgsuGetTwoWeeklySchedule } from "./rgsu/parse-schedule";
import { DateTime } from "luxon";
import { LessonParsed } from "./flatten-schedule";
import { rgsuGetToken } from "./rgsu/get-token";
import {
  isRgsuBotBlockedError,
  isRgsuGroupGuidNotFoundError,
} from "./rgsu/errors";
import {
  ensureRgsuProxy,
  rotateRgsuProxyAfterBlock,
} from "./rgsu/proxy-manager";

async function getRgsuScheduleWithProxyRecovery(
  groupId: string,
  groupTitle: string,
  week: DateTime,
  tokens: Awaited<ReturnType<typeof rgsuGetToken>>,
): Promise<LessonParsed[]> {
  try {
    return await rgsuGetTwoWeeklySchedule(groupId, groupTitle, week, tokens);
  } catch (error) {
    if (!isRgsuBotBlockedError(error)) throw error;

    await rotateRgsuProxyAfterBlock();
    const refreshedTokens = await rgsuGetToken();
    return rgsuGetTwoWeeklySchedule(groupId, groupTitle, week, refreshedTokens);
  }
}

export default async function parseBackground() {
  const startedAt = new Date();
  const reports: UpdateReport[] = [];

  // Расписание обновляется автоматически только у РГСУ. УРТК загружает его вручную из файла.
  if (env.NEXT_PUBLIC_UNIVERSITY !== "RGSU") {
    throw new Error(
      "Автоматическое обновление расписания доступно только для РГСУ",
    );
  }

  await ensureRgsuProxy();
  const groups = await parseRgsuGroups();
  // const groups = [{ title: "ИСТ-Б-02-Д-2025-1", id: "16982" }];

  let i = 0;

  const tokens = await rgsuGetToken();

  for (const group of groups) {
    console.log(`${++i}/${groups.length}`);
    const week = DateTime.now().startOf("week");

    try {
      let schedule: LessonParsed[];
      try {
        schedule = await getRgsuScheduleWithProxyRecovery(
          group.id,
          group.title,
          week,
          tokens,
        );
      } catch (error) {
        if (!isRgsuGroupGuidNotFoundError(error)) throw error;

        const refreshedGroupId = await refreshRgsuGroupAdditionalId({
          id: group.databaseId,
          title: group.title,
        });

        if (!refreshedGroupId) {
          const deletion = await deleteMissingRgsuGroup({
            id: group.databaseId,
            title: group.title,
            additionalId: group.id,
          });
          console.warn(
            `Группа ${group.title} удалена: отвязано пользователей ${deletion.usersDetached}, удалено занятий ${deletion.lessonsDeleted}, удалено избранных ${deletion.favouritesDeleted}`,
          );
          continue;
        }

        console.log(
          `GUID группы ${group.title} обновлён: ${group.id} → ${refreshedGroupId}`,
        );
        schedule = await getRgsuScheduleWithProxyRecovery(
          refreshedGroupId,
          group.title,
          week,
          await rgsuGetToken(),
        );
      }

      if (!schedule.length) continue;

      const result = await updateSchedule(schedule, true);
      reports.push(result);
    } catch (err) {
      if (isRgsuBotBlockedError(err)) throw err;
      const message = `Ошибка парсинга группы: ${group.title} ${group.id}`;
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(message, errorMessage);
      reports.push({
        error: `${message} ${errorMessage}`,
        summary: {
          added: 0,
          updated: 0,
          deleted: 0,
          errors: 1,
          notificationsSent: 0,
          notificationsError: 0,
          groupsAffected: [],
          teachersAffected: [],
        },
        result: [],
        notificationResult: [],
      });
    }
  }

  const reportTotal: UpdateReport = {
    summary: {
      added: 0,
      updated: 0,
      deleted: 0,
      errors: 0,
      notificationsSent: 0,
      notificationsError: 0,
      groupsAffected: [],
      teachersAffected: [],
    },
    result: [],
    notificationResult: [],
  };
  for (let report of reports) {
    reportTotal.summary.added += report.summary.added;
    reportTotal.summary.updated += report.summary.updated;
    reportTotal.summary.deleted += report.summary.deleted;
    reportTotal.summary.errors += report.summary.errors;
    reportTotal.summary.notificationsSent += report.summary.notificationsSent;
    reportTotal.summary.notificationsError += report.summary.notificationsError;

    reportTotal.summary.groupsAffected.push(...report.summary.groupsAffected);
    reportTotal.summary.teachersAffected.push(
      ...report.summary.teachersAffected,
    );

    reportTotal.result.push(...report.result);
    reportTotal.notificationResult.push(...report.notificationResult);
  }

  await db.report.create({
    data: {
      startedAt: startedAt,
      endedAt: new Date(),
      result: JSON.stringify(reportTotal),
    },
  });
}
