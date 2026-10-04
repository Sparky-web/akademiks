import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import axios from "axios";
import { DateTime } from "luxon";

// Эти тесты не должны использовать реальные прокси, БД или Telegram.
process.env.PROXY_URL = "";
process.env.PX6_API_KEY = "";
process.env.RGSU_PROXY_ROTATION_TELEGRAM_BOT_TOKEN = "test-token";
process.env.RGSU_PROXY_ROTATION_TELEGRAM_CHAT_ID = "test-chat";
const { extractTeacherGroupTitles, fetchTeacherGroupTitles } =
  await import("./parse-groups-from-teachers-schedule");
const { createGroupNotificationQueue } = await import("./group-notifications");
const { updateRgsuGroupIds } = await import("./parse-groups");
const { client } = await import("./axios-client");
const { db } = await import("~/server/db");

const teacherResponse = (titles: unknown) => ({
  success: true,
  data: { schedule: { "08:30": { "2026-09-21": titles } } },
});

test("teacher responses contain group strings, arrays and multiple lessons", () => {
  assert.deepEqual(
    extractTeacherGroupTitles(
      teacherResponse([
        { teacherName: [" Группа-1 ", "Группа-2", "Группа-1"] },
        { teacherName: "Группа-3" },
        [],
        { teacherName: null },
      ]),
    ),
    ["Группа-1", "Группа-2", "Группа-3"],
  );
  assert.deepEqual(
    extractTeacherGroupTitles({ success: true, data: { schedule: [] } }),
    [],
  );
  assert.throws(() => extractTeacherGroupTitles(""), /некорректный/);
  assert.throws(() => extractTeacherGroupTitles({ success: true }), /schedule/);
  assert.throws(
    () =>
      extractTeacherGroupTitles({ success: false, message: "Возможно вы бот" }),
    /бота/,
  );
});

test("teacher request uses current POST API, tokens, canonical name and four weeks", async (t) => {
  t.mock.method(
    client,
    "post",
    async (
      url: string,
      body: FormData,
      config: { headers: Record<string, string> },
    ) => {
      const parsed = new URL(url);
      assert.equal(parsed.searchParams.get("nc_ctpl"), "846");
      assert.equal(parsed.searchParams.get("teacher"), "Иванов Иван & Пётр");
      assert.equal(parsed.searchParams.get("date_from"), "2026-09-21");
      assert.equal(parsed.searchParams.get("date_to"), "2026-10-18");
      assert.equal(body.get("csrf_token"), "csrf");
      assert.equal(body.get("check_token"), "check");
      assert.equal(config.headers["x-csrf-token"], "csrf");
      return { data: teacherResponse({ teacherName: "Группа-1" }) };
    },
  );
  assert.deepEqual(
    await fetchTeacherGroupTitles(
      "Иванов Иван & Пётр",
      { csrfToken: "csrf", checkToken: "check" },
      DateTime.fromISO("2026-09-21"),
    ),
    ["Группа-1"],
  );
});

test("failed Telegram delivery remains queued and is retried without re-adding the group", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "rgsu-notify-"));
  try {
    const group = {
      id: "new",
      title: "НОВАЯ-2026-1",
      additionalId: "123",
      source: "teachers" as const,
    };
    const failed = createGroupNotificationQueue(directory, async () => {
      throw new Error("offline");
    });
    await failed.enqueue(group);
    await failed.enqueue(group);
    await assert.rejects(failed.flush(), /offline/);
    const messages: string[] = [];
    const retry = createGroupNotificationQueue(directory, async (text) => {
      messages.push(text);
    });
    await retry.flush();
    await retry.flush();
    assert.equal(messages.length, 1);
    assert.match(messages[0]!, /НОВАЯ-2026-1/);
    assert.match(messages[0]!, /расписание преподавателей/);
    assert.deepEqual(
      JSON.parse(
        await readFile(
          path.join(directory, "groups-pending-notifications.json"),
          "utf8",
        ),
      ),
      [],
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("notifications split large additions into Telegram-sized batches", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "rgsu-notify-"));
  try {
    const messages: string[] = [];
    const queue = createGroupNotificationQueue(directory, async (text) => {
      messages.push(text);
    });
    for (let i = 0; i < 80; i++)
      await queue.enqueue({
        id: `${i}`,
        title: `ГРУППА-${i}`,
        additionalId: `${i}`,
        source: "family",
      });
    await queue.flush();
    assert.ok(messages.length > 1);
    assert.ok(messages.every((text) => text.length <= 3500));
    assert.equal(messages.join("").match(/GUID:/g)?.length, 80);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

for (const { dryRun, addOnly } of [
  { dryRun: true, addOnly: false },
  { dryRun: false, addOnly: false },
  { dryRun: false, addOnly: true },
]) {
  test(`group update discovers teachers and family groups, rejects conflicts; dryRun=${dryRun}, addOnly=${addOnly}`, async (t) => {
    const directory = await mkdtemp(path.join(tmpdir(), "rgsu-sync-"));
    const previousState = process.env.XDG_STATE_HOME;
    process.env.XDG_STATE_HOME = directory;
    const stored = [{ id: "old", title: "СТАРАЯ-2026-1", additionalId: "1" }];
    const searches: Record<string, { name: string; id: string }[]> = {
      "СТАРАЯ-2026-1": [{ name: "СТАРАЯ-2026-1", id: "11" }],
      "НОВАЯ-2026-1": [{ name: "НОВАЯ-2026-1", id: "2" }],
      "ЧУЖАЯ-2026-1": [{ name: "ЧУЖАЯ-2026-10", id: "3" }],
      "КОНФЛИКТ-2026-1": [
        { name: "КОНФЛИКТ-2026-1", id: addOnly ? "1" : "11" },
      ],
      "СТАРАЯ-2026": [
        { name: "СТАРАЯ-2026-1", id: "11" },
        { name: "СТАРАЯ-2026-2", id: "4" },
      ],
      "НОВАЯ-2026": [{ name: "НОВАЯ-2026-1", id: "2" }],
    };
    const stub = (
      target: object,
      name: string,
      replacement: (...args: any[]) => any,
    ) => {
      const model = target as Record<string, unknown>;
      const original = model[name];
      model[name] = replacement;
      t.after(() => {
        model[name] = original;
      });
    };
    const writes: string[] = [];
    const messages: string[] = [];
    stub(db.group, "findMany", async () => structuredClone(stored));
    stub(db.teacher, "findMany", async () => [{ name: "Иванов Иван" }]);
    stub(db.group, "findFirst", async () => null);
    stub(
      db.group,
      "findUnique",
      async ({ where }: { where: { id: string } }) =>
        stored.find((group) => group.id === where.id) ?? null,
    );
    stub(db.group, "update", async () => {
      writes.push("update");
    });
    stub(
      db.group,
      "create",
      async ({ data }: { data: (typeof stored)[number] }) => {
        writes.push(data.title);
        stored.push(data);
        return data;
      },
    );
    t.mock.method(client, "get", async () => ({
      data: '<form id="needform"><input name="csrf_token" value="csrf"><input name="check_token" value="check"></form>',
    }));
    t.mock.method(client, "post", async (url: string) => {
      const params = new URL(url).searchParams;
      if (params.has("teacher"))
        return {
          data: teacherResponse({
            teacherName: [
              "НОВАЯ-2026-1",
              "СТАРАЯ-2026-1",
              "ЧУЖАЯ-2026-1",
              "КОНФЛИКТ-2026-1",
            ],
          }),
        };
      return {
        data: { success: true, data: searches[params.get("q")!] ?? [] },
      };
    });
    t.mock.method(
      axios,
      "post",
      async (_url: string, body: { text: string }) => {
        assert.ok(
          stored.some((group) => group.title === "НОВАЯ-2026-1"),
          "notify only after insert",
        );
        messages.push(body.text);
        return { data: { ok: true } };
      },
    );
    try {
      const result = await updateRgsuGroupIds({ dryRun, addOnly });
      assert.equal(result.created, 2);
      assert.equal(result.teachersChecked, 1);
      assert.deepEqual(
        result.addedGroups.map((group) => group.source),
        ["teachers", "family"],
      );
      assert.equal(result.errors.length, 1);
      assert.match(result.errors[0]!, /Конфликт ID/);
      assert.equal(result.warnings.length, 1);
      assert.equal(writes.length, dryRun ? 0 : addOnly ? 2 : 3);
      assert.equal(result.updated, addOnly ? 0 : 1);
      assert.equal(messages.length, dryRun ? 0 : 1);
    } finally {
      if (previousState === undefined) delete process.env.XDG_STATE_HOME;
      else process.env.XDG_STATE_HOME = previousState;
      await rm(directory, { recursive: true, force: true });
    }
  });
}

test("unknown teacher is a warning; network failure remains an error", async (t) => {
  const { parseGroupsFromTeachersSchedule } =
    await import("./parse-groups-from-teachers-schedule");
  t.mock.method(client, "post", async (url: string) => {
    const teacher = new URL(url).searchParams.get("teacher");
    if (teacher === "Не найден")
      return {
        data: {
          success: false,
          message: "Не удалось найти GUID преподавателя",
        },
      };
    throw new Error("network timeout");
  });
  const result = await parseGroupsFromTeachersSchedule(
    [{ name: "Не найден" }, { name: "Ошибка сети" }],
    { csrfToken: "csrf", checkToken: "check" },
  );
  assert.equal(result.checked, 0);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0]!, /Не найден/);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0]!, /network timeout/);
});

test("notification prepared before failed INSERT is not sent", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "rgsu-pending-"));
  try {
    const messages: string[] = [];
    const queue = createGroupNotificationQueue(directory, async (text) => {
      messages.push(text);
    });
    await queue.enqueue({
      id: "never-saved",
      title: "НЕ СОХРАНЕНА",
      additionalId: "5",
      source: "teachers",
    });
    await queue.flush(async () => false);
    assert.equal(messages.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("CLI and HTTP cannot update groups concurrently, and failed run releases lock", async () => {
  const { withGroupUpdateLock } = await import("./group-update-lock");
  const directory = await mkdtemp(path.join(tmpdir(), "rgsu-lock-"));
  const previous = process.env.XDG_STATE_HOME;
  process.env.XDG_STATE_HOME = directory;
  try {
    await assert.rejects(
      withGroupUpdateLock(async () => {
        await assert.rejects(
          withGroupUpdateLock(async () => "overlap"),
          /уже обновляются/,
        );
        throw new Error("failed update");
      }),
      /failed update/,
    );
    assert.equal(await withGroupUpdateLock(async () => "released"), "released");
  } finally {
    if (previous === undefined) delete process.env.XDG_STATE_HOME;
    else process.env.XDG_STATE_HOME = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
