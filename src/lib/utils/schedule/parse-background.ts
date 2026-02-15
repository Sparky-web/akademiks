import { env } from "~/env";
import { db } from "~/server/db";

import axios from "axios";
import * as cheerio from "cheerio";
import { google } from "googleapis";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";

import parseScheduleFromWorkbook from "~/lib/utils/schedule/parse-schedule-from-workbook";
import updateSchedule, {
  ResultItem,
  UpdateReport,
} from "~/server/api/routers/schedule/_lib/utils/update-schedule";
import { parseRgsuGroups } from "./rgsu/parse-groups";
import { rgsuGetWeeklySchedule } from "./rgsu/parse-schedule";
import { DateTime } from "luxon";
import { LessonParsed } from "./flatten-schedule";
import _ from "lodash";
import { rgsuGetToken, RgsuTokens } from "./rgsu/get-token";

const scopes = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

async function authorize() {
  const client_email = env.GOOGLE_API_EMAIL;
  const private_key = env.GOOGLE_API_KEY;
  const auth = new google.auth.JWT(client_email, null, private_key, scopes);
  return auth;
}

async function fetchPageLinks(url: string) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  const links: string[] = [];

  $("a").each((i, element) => {
    const href = $(element).attr("href");
    if (href && href.includes("docs.google.com/spreadsheets/")) {
      links.push(href);
    }
  });

  return links;
}

async function downloadSpreadsheetAsXLSX(sheetId: string) {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.export(
    {
      auth,
      fileId: sheetId,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { responseType: "stream" },
  );

  return new Promise((resolve, reject) => {
    const chunks = [];

    response.data.on("data", (chunk) => {
      chunks.push(chunk);
    });

    response.data.on("end", () => {
      // Concatenate all the chunks into a single Buffer
      const buffer = Buffer.concat(chunks);
      // Convert Buffer to ArrayBuffer
      const arrayBuffer = new Uint8Array(buffer).buffer;
      resolve(arrayBuffer);
    });

    response.data.on("error", (err) => {
      reject(`Error downloading file: ${err.message}`);
    });
  });
}

export default async function parseBackground() {
  const startedAt = new Date();
  const reports: UpdateReport[] = [];

  if (env.NEXT_PUBLIC_UNIVERSITY === "RGSU") {
    const groups = await parseRgsuGroups();

    const chunks = _.chunk(groups, 10);
    let i = 0;

    const tokens: RgsuTokens = {
      csrfToken: "699223e7c5a3a",
      checkToken: "987456",
    };

    for (const chunk of chunks) {
      console.log(`${i++}/${chunks.length}`);
      await Promise.all(
        chunk.map(async (group) => {
          const weekCurrent = DateTime.now().startOf("week");
          const weekNext = weekCurrent.plus({ week: 1 });

          const weeks = [weekCurrent, weekNext];

          const mergedSchedule: LessonParsed[] = [];
          try {
            for (const week of weeks) {
              const schedule = await rgsuGetWeeklySchedule(
                group.id,
                group.title,
                week,
                tokens,
              );

              mergedSchedule.push(...schedule);
            }

            const result = await updateSchedule(mergedSchedule, true);
            reports.push(result);
          } catch (err) {
            const message = `Ошибка парсинга группы: ${group.title} ${group.id}`;
            console.error(message, err);
            reports.push({
              error: `${message} ${err}`,
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
            });
          }
        }),
      );
      await new Promise((r) => setTimeout(r, 3000));
    }
  } else {
    const config = await db.config.findFirst({
      select: {
        parseSpreadsheetPageUrl: true,
        parseInterval: true,
      },
    });

    if (!config) throw new Error("Запись конфигурации в БД не обнаружена");

    let links = await fetchPageLinks(config.parseSpreadsheetPageUrl);

    for (const link of links) {
      const sheetId = link.match(/[-\w]{25,}/)[0];

      if (!sheetId) {
        console.error(`Ошибка при обновлении расписания: ${link}`);
        continue;
      }

      try {
        const buffer = await downloadSpreadsheetAsXLSX(sheetId);
        const workbook = XLSX.read(buffer, { type: "array" });
        const data = parseScheduleFromWorkbook(workbook);
        const result = await updateSchedule(data, true);
        reports.push(result);
      } catch (e) {
        console.error(
          `Ошибка при обновлении расписания: ${sheetId}`,
          e.message,
        );
      }
      console.log(`Обновлено расписание: ${sheetId}`);
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
