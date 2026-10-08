import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../db";
import { Prisma } from "@prisma/client";
import { DELETE, GET, PATCH, POST } from "../../app/api/v1/[...path]/route";
import { hashToken, issueToken, readBearer } from "./token";

const restorers: (() => void)[] = [];
const mock = {
  method(target: any, key: string, implementation: (...args: any[]) => any) {
    const original = target[key];
    let once: ((...args: any[]) => any) | undefined;
    target[key] = (...args: any[]) => {
      const fn = once ?? implementation;
      once = undefined;
      return fn(...args);
    };
    const restore = () => {
      target[key] = original;
    };
    restorers.push(restore);
    return {
      mock: {
        restore,
        mockImplementationOnce(fn: (...args: any[]) => any) {
          once = fn;
        },
      },
    };
  },
  restoreAll() {
    restorers.reverse().forEach((restore) => restore());
  },
};
const secret = issueToken();
const handlers = { GET, POST, PATCH, DELETE };
function request(
  path: string[],
  query = "",
  authorization: string | null = `Bearer ${secret.token}`,
  method: keyof typeof handlers = "GET",
  body?: unknown,
) {
  return handlers[method](
    new Request(`http://localhost/api/v1/${path.join("/")}${query}`, {
      method,
      headers: authorization ? { Authorization: authorization } : {},
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    { params: Promise.resolve({ path }) },
  );
}
const notFound = () =>
  new Prisma.PrismaClientKnownRequestError("not found", {
    code: "P2025",
    clientVersion: "6",
  });

test("REST authorization, counting, validation and schedule", async (t) => {
  let count = 0;
  let scopes: string[] = [];
  const update = mock.method(db.apiToken, "update", async (args: any) => {
    assert.deepEqual(args.where, {
      tokenHash: secret.tokenHash,
      revokedAt: null,
    });
    assert.deepEqual(args.data.requestCount, { increment: 1 });
    count++;
    return { id: "token", name: "Агент", scopes };
  });
  try {
    await t.test("random secrets and strict bearer parsing", () => {
      assert.notEqual(issueToken().token, secret.token);
      assert.equal(hashToken(secret.token), secret.tokenHash);
      assert.equal(readBearer(`Bearer ${secret.token}`), secret.token);
      assert.equal(readBearer(secret.token), null);
      assert.equal(readBearer("Bearer invalid"), null);
    });
    await t.test("missing token does not count", async () => {
      const result = await request(["groups"], "", null);
      assert.equal(result.status, 401);
      assert.equal(result.headers.get("cache-control"), "no-store");
      assert.equal(count, 0);
    });
    await t.test("revoked token returns 401", async () => {
      update.mock.mockImplementationOnce(async () => {
        throw notFound();
      });
      assert.equal((await request(["groups"])).status, 401);
    });
    await t.test(
      "authenticated invalid requests count independently",
      async () => {
        const before = count;
        const results = await Promise.all(
          Array.from({ length: 20 }, () => request(["groups"], "?limit=0")),
        );
        assert.ok(results.every((result) => result.status === 400));
        assert.equal(count - before, 20);
        assert.equal(
          (
            await request(
              ["teachers", "x", "schedule"],
              "?weekStart=2026-02-30",
            )
          ).status,
          400,
        );
        assert.equal((await request(["unknown"])).status, 404);
      },
    );
    await t.test("unknown entity returns 404", async () => {
      const find = mock.method(db.group, "findUnique", async () => null);
      assert.equal(
        (await request(["groups", "missing", "schedule"])).status,
        404,
      );
      find.mock.restore();
    });
    await t.test(
      "schedule filters unpublished lessons for both resources",
      async () => {
        const group = mock.method(db.group, "findUnique", async () => ({
          id: "g",
          title: "Group",
        }));
        const teacher = mock.method(db.teacher, "findUnique", async () => ({
          id: "t",
          name: "Teacher",
        }));
        const lessons = mock.method(
          db.lesson,
          "findMany",
          async (args: any) => {
            assert.equal(args.where.shouldDisplayForStudents, true);
            assert.equal(
              args.where.start.lt.getTime() - args.where.start.gte.getTime(),
              7 * 86400000,
            );
            return [];
          },
        );
        for (const resource of ["groups", "teachers"]) {
          const result = await request(
            [resource, resource === "groups" ? "g" : "t", "schedule"],
            "?weekStart=2026-09-14",
          );
          assert.equal(result.status, 200);
          assert.deepEqual((await result.json()).data, []);
        }
        group.mock.restore();
        teacher.mock.restore();
        lessons.mock.restore();
      },
    );
    await t.test(
      "lists return pagination and selected public fields",
      async () => {
        const group = mock.method(db.group, "findMany", async (args: any) => {
          assert.deepEqual(args.select, { id: true, title: true });
          assert.equal(args.skip, 2);
          return [{ id: "g", title: "Group" }];
        });
        const teacher = mock.method(
          db.teacher,
          "findMany",
          async (args: any) => {
            assert.deepEqual(args.select, { id: true, name: true });
            return [{ id: "t", name: "Teacher" }];
          },
        );
        const groups = mock.method(db.group, "count", async () => 3);
        const teachers = mock.method(db.teacher, "count", async () => 3);
        const transaction = mock.method(db, "$transaction", (queries: any[]) =>
          Promise.all(queries),
        );
        for (const resource of ["groups", "teachers"]) {
          const result = await request([resource], "?limit=1&offset=2");
          assert.equal(result.status, 200);
          const body = await result.json();
          assert.deepEqual(body.pagination, { limit: 1, offset: 2, total: 3 });
          assert.equal(body.data.length, 1);
        }
        group.mock.restore();
        teacher.mock.restore();
        groups.mock.restore();
        teachers.mock.restore();
        transaction.mock.restore();
      },
    );
    await t.test("read-only token cannot write", async () => {
      scopes = [];
      const before = count;
      const result = await request(
        ["lessons", "batch"],
        "",
        undefined,
        "POST",
        {
          operations: [{ op: "delete", id: 1 }],
        },
      );
      assert.equal(result.status, 403);
      assert.equal((await result.json()).error.code, "FORBIDDEN");
      assert.equal(
        (await request(["lessons"], "?from=2026-10-12&includeHidden=true"))
          .status,
        403,
      );
      assert.equal(count - before, 2);
      const me = await (await request(["me"])).json();
      assert.deepEqual(me.data.scopes, ["read"]);
    });
    await t.test("unsupported method on known route returns 405", async () => {
      const result = await request(["classrooms"], "", undefined, "DELETE");
      assert.equal(result.status, 405);
      assert.equal(result.headers.get("allow"), "GET");
    });
    await t.test("batch validates every operation before writing", async () => {
      scopes = ["schedule:write"];
      const lessons = mock.method(db.lesson, "findMany", async () => []);
      const teachers = mock.method(db.teacher, "findMany", async () => []);
      const groups = mock.method(db.group, "findMany", async () => []);
      const classrooms = mock.method(db.classroom, "findMany", async () => []);
      const transaction = mock.method(db, "$transaction", async () => {
        throw new Error("must not write");
      });
      const invalid = await request(
        ["lessons", "batch"],
        "",
        undefined,
        "POST",
        {
          operations: [{ op: "update", id: 1, data: { color: "red" } }],
        },
      );
      assert.equal(invalid.status, 400);
      const result = await request(
        ["lessons", "batch"],
        "",
        undefined,
        "POST",
        {
          operations: [
            { op: "update", id: 1, data: { classroomId: 5 } },
            { op: "delete", id: 1 },
          ],
        },
      );
      assert.equal(result.status, 422);
      const details = (await result.json()).error.details;
      assert.deepEqual(
        details.map((item: any) => item.index).sort(),
        [0, 1, 1],
      );
      for (const fn of [lessons, teachers, groups, classrooms, transaction])
        fn.mock.restore();
    });
    await t.test("dry run previews and real run applies changes", async () => {
      scopes = ["schedule:write"];
      const existing = {
        id: 7,
        title: "Математика",
        start: new Date("2026-10-12T03:30:00Z"),
        end: new Date("2026-10-12T05:00:00Z"),
        index: 1,
        subgroup: null,
        type: null,
        meetingUrl: "https://meet.example/x",
        shouldDisplayForStudents: true,
        teacherId: "t",
        groupId: "g",
        classroomId: 1,
        Teacher: { id: "t", name: "Teacher" },
        Group: { id: "g", title: "Group" },
        Classroom: { id: 1, name: "101", address: null },
      };
      const lessons = mock.method(db.lesson, "findMany", async () => [
        existing,
      ]);
      const teachers = mock.method(db.teacher, "findMany", async () => []);
      const groups = mock.method(db.group, "findMany", async () => []);
      const classrooms = mock.method(db.classroom, "findMany", async () => [
        { id: 5, name: "Дистант", address: null },
      ]);
      const writes: any[] = [];
      const transaction = mock.method(db, "$transaction", async (fn: any) =>
        fn({
          lesson: {
            update: async (args: any) => writes.push(args),
          },
        }),
      );
      const report = mock.method(db.report, "create", async () => ({}));
      const body = {
        dryRun: true,
        operations: [{ op: "update", id: 7, data: { classroomId: 5 } }],
      };
      const dry = await (
        await request(["lessons", "batch"], "", undefined, "POST", body)
      ).json();
      assert.equal(dry.applied, false);
      assert.equal(writes.length, 0);
      assert.equal(dry.results[0].after.classroom.name, "Дистант");
      // Перенос в «Дистант» сохраняет ссылку на встречу.
      assert.equal(dry.results[0].after.meetingUrl, "https://meet.example/x");
      const real = await (
        await request(["lessons", "batch"], "", undefined, "POST", {
          ...body,
          dryRun: false,
        })
      ).json();
      assert.equal(real.applied, true);
      assert.deepEqual(real.summary, {
        created: 0,
        updated: 1,
        deleted: 0,
        unchanged: 0,
      });
      assert.equal(writes[0].where.id, 7);
      assert.equal(writes[0].data.classroomId, 5);
      for (const fn of [
        lessons,
        teachers,
        groups,
        classrooms,
        transaction,
        report,
      ])
        fn.mock.restore();
    });
    await t.test("deleting a used group requires force", async () => {
      scopes = ["groups:write"];
      const find = mock.method(db.group, "findUnique", async () => ({
        id: "g",
      }));
      const lessons = mock.method(db.lesson, "count", async () => 3);
      const users = mock.method(db.user, "count", async () => 0);
      const result = await request(["groups", "g"], "", undefined, "DELETE");
      assert.equal(result.status, 409);
      assert.deepEqual((await result.json()).error.details, {
        lessons: 3,
        users: 0,
      });
      for (const fn of [find, lessons, users]) fn.mock.restore();
    });
    await t.test("database failure returns generic error", async () => {
      update.mock.mockImplementationOnce(async () => {
        throw new Error("private details");
      });
      const result = await request(["groups"]);
      assert.equal(result.status, 500);
      assert.ok(!(await result.text()).includes("private details"));
    });
  } finally {
    mock.restoreAll();
  }
});
