import assert from "node:assert/strict";
import { test } from "node:test";
import { db } from "../db";
import { GET } from "../../app/api/v1/[...path]/route";
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
function request(
  path: string[],
  query = "",
  authorization: string | null = `Bearer ${secret.token}`,
) {
  return GET(
    new Request(`http://localhost/api/v1/${path.join("/")}${query}`, {
      headers: authorization ? { Authorization: authorization } : {},
    }),
    { params: Promise.resolve({ path }) },
  );
}

test("REST authorization, counting, validation and schedule", async (t) => {
  let count = 0;
  const update = mock.method(db.apiToken, "updateMany", async (args: any) => {
    assert.deepEqual(args.where, {
      tokenHash: secret.tokenHash,
      revokedAt: null,
    });
    assert.deepEqual(args.data.requestCount, { increment: 1 });
    count++;
    return { count: 1 };
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
      update.mock.mockImplementationOnce(async () => ({ count: 0 }));
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
