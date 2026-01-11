import { Prisma } from "@prisma/client";
import _ from "lodash";

import { describe, it } from "node:test";

import DateTime from "~/lib/utils/datetime";
import { groupExistingLessonsByDay, groupNewLessonsByDay } from "./utils";
import { db } from "~/server/db";
import assert from "node:assert";

describe("Утилиты выявления изменений расписания РГСУ", () => {
  it("groupExistingLessonsByDay отрабатывает корректно", async () => {
    const input = [
      {
        id: 95535,
        title: "Анатомия человека",
        createdAt: "2026-01-10T17:52:16.754Z",
        updatedAt: "2026-01-10T17:56:51.091Z",
        start: "2026-01-09T07:10:00.000Z",
        end: "2026-01-09T08:40:00.000Z",
        index: 2,
        subgroup: 2,
        type: "дифференцированный зачет",
        teacherId: "kachenkova-ekaterina-sergeevna",
        groupId: "afk-b-0-d-2025-1",
        startDay: "2026-01-08T21:00:00.000Z",
        classroomId: 2397,
        shouldDisplayForStudents: true,
        Teacher: {
          id: "kachenkova-ekaterina-sergeevna",
          name: "Каченкова Екатерина Сергеевна",
        },
        Group: {
          id: "afk-b-0-d-2025-1",
          title: "АФК-Б-0-Д-2025-1",
        },
        Classroom: {
          id: 2397,
          name: "205",
          isHidden: false,
          address: "ул. Лосиноостровская, 24",
        },
      },
      {
        id: 95614,
        title: "Философия",
        createdAt: "2026-01-10T17:56:51.099Z",
        updatedAt: "2026-01-10T17:56:51.099Z",
        start: "2026-01-09T07:10:00.000Z",
        end: "2026-01-09T08:40:00.000Z",
        index: 2,
        subgroup: 1,
        type: null,
        teacherId: "kurbanbaev-kylychbek-azimovich",
        groupId: "afk-b-0-d-2025-1",
        startDay: "2026-01-08T21:00:00.000Z",
        classroomId: 2489,
        shouldDisplayForStudents: true,
        Teacher: {
          id: "kurbanbaev-kylychbek-azimovich",
          name: "Курбанбаев Кылычбек Азимович",
        },
        Group: {
          id: "afk-b-0-d-2025-1",
          title: "АФК-Б-0-Д-2025-1",
        },
        Classroom: {
          id: 2489,
          name: "101",
          isHidden: false,
          address: "ул. Народная, 21",
        },
      },
      {
        id: 95536,
        title: "Философия",
        createdAt: "2026-01-10T17:52:16.759Z",
        updatedAt: "2026-01-10T17:52:16.759Z",
        start: "2026-01-10T09:10:00.000Z",
        end: "2026-01-10T10:40:00.000Z",
        index: 3,
        subgroup: null,
        type: "экзамен",
        teacherId: "lonskiy-yaroslav-aleksandrovich",
        groupId: "afk-b-0-d-2025-1",
        startDay: "2026-01-09T21:00:00.000Z",
        classroomId: 2312,
        shouldDisplayForStudents: true,
        Teacher: {
          id: "lonskiy-yaroslav-aleksandrovich",
          name: "Лонский Ярослав Александрович",
        },
        Group: {
          id: "afk-b-0-d-2025-1",
          title: "АФК-Б-0-Д-2025-1",
        },
        Classroom: {
          id: 2312,
          name: "218",
          isHidden: false,
          address: "ул. В Пика д.4 кор.8",
        },
      },
      {
        id: 95537,
        title: "Философия",
        createdAt: "2026-01-10T17:52:16.762Z",
        updatedAt: "2026-01-10T17:52:16.762Z",
        start: "2026-01-10T10:50:00.000Z",
        end: "2026-01-10T12:20:00.000Z",
        index: 4,
        subgroup: null,
        type: "экзамен",
        teacherId: "lonskiy-yaroslav-aleksandrovich",
        groupId: "afk-b-0-d-2025-1",
        startDay: "2026-01-09T21:00:00.000Z",
        classroomId: 2312,
        shouldDisplayForStudents: true,
        Teacher: {
          id: "lonskiy-yaroslav-aleksandrovich",
          name: "Лонский Ярослав Александрович",
        },
        Group: {
          id: "afk-b-0-d-2025-1",
          title: "АФК-Б-0-Д-2025-1",
        },
        Classroom: {
          id: 2312,
          name: "218",
          isHidden: false,
          address: "ул. В Пика д.4 кор.8",
        },
      },
    ].map((lesson) => ({
      ...lesson,
      start: new Date(lesson.start),
      end: new Date(lesson.end),
      startDay: new Date(lesson.startDay),
    })) as unknown as Prisma.LessonGetPayload<{
      include: {
        Group: true;
        Teacher: true;
        Classroom: true;
      };
    }>[];

    const output = groupExistingLessonsByDay(
      input,
      DateTime.fromSQL("2026-01-05").startOf("day").toJSDate(),
      DateTime.fromSQL("2026-01-11").startOf("day").toJSDate(),
    );

    assert.strictEqual(
      JSON.stringify(output),
      '[{"startDay":"2026-01-05T00:00:00.000+03:00","slots":[]},{"startDay":"2026-01-06T00:00:00.000+03:00","slots":[]},{"startDay":"2026-01-07T00:00:00.000+03:00","slots":[]},{"startDay":"2026-01-08T00:00:00.000+03:00","slots":[]},{"startDay":"2026-01-09T00:00:00.000+03:00","slots":[{"startIndex":1,"lessons":[]},{"startIndex":2,"lessons":[{"title":"Анатомия человека","index":2,"type":"дифференцированный зачет","start":"2026-01-09T07:10:00.000Z","classroom":"205","teacher":"Каченкова Екатерина Сергеевна","end":"2026-01-09T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":2},{"title":"Философия","index":2,"start":"2026-01-09T07:10:00.000Z","classroom":"101","teacher":"Курбанбаев Кылычбек Азимович","end":"2026-01-09T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":1}]},{"startIndex":3,"lessons":[]},{"startIndex":4,"lessons":[]},{"startIndex":5,"lessons":[]},{"startIndex":6,"lessons":[]},{"startIndex":7,"lessons":[]},{"startIndex":8,"lessons":[]}]},{"startDay":"2026-01-10T00:00:00.000+03:00","slots":[{"startIndex":1,"lessons":[]},{"startIndex":2,"lessons":[]},{"startIndex":3,"lessons":[{"title":"Философия","index":3,"type":"экзамен","start":"2026-01-10T09:10:00.000Z","classroom":"218","teacher":"Лонский Ярослав Александрович","end":"2026-01-10T10:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null}]},{"startIndex":4,"lessons":[{"title":"Философия","index":4,"type":"экзамен","start":"2026-01-10T10:50:00.000Z","classroom":"218","teacher":"Лонский Ярослав Александрович","end":"2026-01-10T12:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null}]},{"startIndex":5,"lessons":[]},{"startIndex":6,"lessons":[]},{"startIndex":7,"lessons":[]},{"startIndex":8,"lessons":[]}]},{"startDay":"2026-01-11T00:00:00.000+03:00","slots":[]}]',
    );
  });

  it("groupNewLessonsByDay отрабатывает корректно", async () => {
    const input = JSON.parse(
      `[{"index":1,"title":null,"start":"2026-01-05T05:30:00.000Z","end":"2026-01-05T07:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":2,"title":null,"start":"2026-01-05T07:10:00.000Z","end":"2026-01-05T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":3,"title":null,"start":"2026-01-05T09:10:00.000Z","end":"2026-01-05T10:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":4,"title":null,"start":"2026-01-05T10:50:00.000Z","end":"2026-01-05T12:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":5,"title":null,"start":"2026-01-05T12:30:00.000Z","end":"2026-01-05T14:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":6,"title":null,"start":"2026-01-05T14:10:00.000Z","end":"2026-01-05T15:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":7,"title":null,"start":"2026-01-05T15:50:00.000Z","end":"2026-01-05T17:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":8,"title":null,"start":"2026-01-05T17:30:00.000Z","end":"2026-01-05T19:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":1,"title":null,"start":"2026-01-06T05:30:00.000Z","end":"2026-01-06T07:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":2,"title":null,"start":"2026-01-06T07:10:00.000Z","end":"2026-01-06T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":3,"title":null,"start":"2026-01-06T09:10:00.000Z","end":"2026-01-06T10:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":4,"title":null,"start":"2026-01-06T10:50:00.000Z","end":"2026-01-06T12:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":5,"title":null,"start":"2026-01-06T12:30:00.000Z","end":"2026-01-06T14:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":6,"title":null,"start":"2026-01-06T14:10:00.000Z","end":"2026-01-06T15:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":7,"title":null,"start":"2026-01-06T15:50:00.000Z","end":"2026-01-06T17:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":8,"title":null,"start":"2026-01-06T17:30:00.000Z","end":"2026-01-06T19:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":1,"title":null,"start":"2026-01-07T05:30:00.000Z","end":"2026-01-07T07:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":2,"title":null,"start":"2026-01-07T07:10:00.000Z","end":"2026-01-07T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":3,"title":null,"start":"2026-01-07T09:10:00.000Z","end":"2026-01-07T10:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":4,"title":null,"start":"2026-01-07T10:50:00.000Z","end":"2026-01-07T12:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":5,"title":null,"start":"2026-01-07T12:30:00.000Z","end":"2026-01-07T14:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":6,"title":null,"start":"2026-01-07T14:10:00.000Z","end":"2026-01-07T15:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":7,"title":null,"start":"2026-01-07T15:50:00.000Z","end":"2026-01-07T17:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":8,"title":null,"start":"2026-01-07T17:30:00.000Z","end":"2026-01-07T19:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":1,"title":null,"start":"2026-01-08T05:30:00.000Z","end":"2026-01-08T07:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":2,"title":null,"start":"2026-01-08T07:10:00.000Z","end":"2026-01-08T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":3,"title":null,"start":"2026-01-08T09:10:00.000Z","end":"2026-01-08T10:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":4,"title":null,"start":"2026-01-08T10:50:00.000Z","end":"2026-01-08T12:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":5,"title":null,"start":"2026-01-08T12:30:00.000Z","end":"2026-01-08T14:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":6,"title":null,"start":"2026-01-08T14:10:00.000Z","end":"2026-01-08T15:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":7,"title":null,"start":"2026-01-08T15:50:00.000Z","end":"2026-01-08T17:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":8,"title":null,"start":"2026-01-08T17:30:00.000Z","end":"2026-01-08T19:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":1,"title":null,"start":"2026-01-09T05:30:00.000Z","end":"2026-01-09T07:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":2,"type":"дифференцированный зачет","title":"Анатомия человека 2","classroom":"205","classroomAddress":"ул. Лосиноостровская, 24","teacher":"Каченкова Екатерина Сергеевна","start":"2026-01-09T07:10:00.000Z","end":"2026-01-09T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":2,"type":"дифференцированный зачет","title":"Анатомия человека","classroom":"205","classroomAddress":"ул. Лосиноостровская, 24","teacher":"Каченкова Екатерина Сергеевна","start":"2026-01-09T07:10:00.000Z","end":"2026-01-09T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":3,"title":null,"start":"2026-01-09T09:10:00.000Z","end":"2026-01-09T10:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":4,"title":null,"start":"2026-01-09T10:50:00.000Z","end":"2026-01-09T12:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":5,"title":null,"start":"2026-01-09T12:30:00.000Z","end":"2026-01-09T14:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":6,"title":null,"start":"2026-01-09T14:10:00.000Z","end":"2026-01-09T15:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":7,"title":null,"start":"2026-01-09T15:50:00.000Z","end":"2026-01-09T17:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":8,"title":null,"start":"2026-01-09T17:30:00.000Z","end":"2026-01-09T19:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":1,"title":null,"start":"2026-01-10T05:30:00.000Z","end":"2026-01-10T07:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":2,"title":null,"start":"2026-01-10T07:10:00.000Z","end":"2026-01-10T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":3,"type":"экзамен","title":"Философия","classroom":"218","classroomAddress":"ул. В Пика д.4 кор.8","teacher":"Лонский Ярослав Александрович","start":"2026-01-10T09:10:00.000Z","end":"2026-01-10T10:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":4,"type":"экзамен","title":"Философия","classroom":"218","classroomAddress":"ул. В Пика д.4 кор.8","teacher":"Лонский Ярослав Александрович","start":"2026-01-10T10:50:00.000Z","end":"2026-01-10T12:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":5,"title":null,"start":"2026-01-10T12:30:00.000Z","end":"2026-01-10T14:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":6,"title":null,"start":"2026-01-10T14:10:00.000Z","end":"2026-01-10T15:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":7,"title":null,"start":"2026-01-10T15:50:00.000Z","end":"2026-01-10T17:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":8,"title":null,"start":"2026-01-10T17:30:00.000Z","end":"2026-01-10T19:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":1,"title":null,"start":"2026-01-11T05:30:00.000Z","end":"2026-01-11T07:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":2,"title":null,"start":"2026-01-11T07:10:00.000Z","end":"2026-01-11T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":3,"title":null,"start":"2026-01-11T09:10:00.000Z","end":"2026-01-11T10:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":4,"title":null,"start":"2026-01-11T10:50:00.000Z","end":"2026-01-11T12:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":5,"title":null,"start":"2026-01-11T12:30:00.000Z","end":"2026-01-11T14:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":6,"title":null,"start":"2026-01-11T14:10:00.000Z","end":"2026-01-11T15:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":7,"title":null,"start":"2026-01-11T15:50:00.000Z","end":"2026-01-11T17:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":8,"title":null,"start":"2026-01-11T17:30:00.000Z","end":"2026-01-11T19:00:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null}]`,
    ).map((lesson: any) => ({
      ...lesson,
      start: new Date(lesson.start),
      end: new Date(lesson.end),
    }));

    const output = groupNewLessonsByDay(input);

    assert.strictEqual(
      JSON.stringify(output),
      `[{"startDay":"2026-01-05T00:00:00.000+03:00","slots":[]},{"startDay":"2026-01-06T00:00:00.000+03:00","slots":[]},{"startDay":"2026-01-07T00:00:00.000+03:00","slots":[]},{"startDay":"2026-01-08T00:00:00.000+03:00","slots":[]},{"startDay":"2026-01-09T00:00:00.000+03:00","slots":[{"startIndex":1,"lessons":[]},{"startIndex":2,"lessons":[{"index":2,"type":"дифференцированный зачет","title":"Анатомия человека 2","classroom":"205","classroomAddress":"ул. Лосиноостровская, 24","teacher":"Каченкова Екатерина Сергеевна","start":"2026-01-09T07:10:00.000Z","end":"2026-01-09T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null},{"index":2,"type":"дифференцированный зачет","title":"Анатомия человека","classroom":"205","classroomAddress":"ул. Лосиноостровская, 24","teacher":"Каченкова Екатерина Сергеевна","start":"2026-01-09T07:10:00.000Z","end":"2026-01-09T08:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null}]},{"startIndex":3,"lessons":[]},{"startIndex":4,"lessons":[]},{"startIndex":5,"lessons":[]},{"startIndex":6,"lessons":[]},{"startIndex":7,"lessons":[]},{"startIndex":8,"lessons":[]}]},{"startDay":"2026-01-10T00:00:00.000+03:00","slots":[{"startIndex":1,"lessons":[]},{"startIndex":2,"lessons":[]},{"startIndex":3,"lessons":[{"index":3,"type":"экзамен","title":"Философия","classroom":"218","classroomAddress":"ул. В Пика д.4 кор.8","teacher":"Лонский Ярослав Александрович","start":"2026-01-10T09:10:00.000Z","end":"2026-01-10T10:40:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null}]},{"startIndex":4,"lessons":[{"index":4,"type":"экзамен","title":"Философия","classroom":"218","classroomAddress":"ул. В Пика д.4 кор.8","teacher":"Лонский Ярослав Александрович","start":"2026-01-10T10:50:00.000Z","end":"2026-01-10T12:20:00.000Z","group":"АФК-Б-0-Д-2025-1","subgroup":null}]},{"startIndex":5,"lessons":[]},{"startIndex":6,"lessons":[]},{"startIndex":7,"lessons":[]},{"startIndex":8,"lessons":[]}]},{"startDay":"2026-01-11T00:00:00.000+03:00","slots":[]}]`,
    );
  });
});
