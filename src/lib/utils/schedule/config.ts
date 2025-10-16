import { env } from "~/env";

const config = {
  days: {
    title: {
      column: "A",
      rowStart: 1,
      values: "{date}  {weekday}",
    },
    lessons: {
      single: {
        title: {
          columnIndex: 1,
          rowIndex: 0,
        },
        classroom: {
          columnIndex: 4,
          rowIndex: 0,
        },
        teacher: {
          columnIndex: 1,
          rowIndex: 1,
        },
      },
      double: {
        first: {
          title: {
            columnIndex: 1,
            rowIndex: 0,
          },
          classroom: {
            columnIndex: 2,
            rowIndex: 0,
          },
          teacher: {
            columnIndex: 1,
            rowIndex: 1,
          },
        },
        second: {
          title: {
            columnIndex: 3,
            rowIndex: 0,
          },
          classroom: {
            columnIndex: 4,
            rowIndex: 0,
          },
          teacher: {
            columnIndex: 3,
            rowIndex: 1,
          },
        },
      },
      length: 2,
    },
    rowStart: 7,
    length: 14,
  },
  groups: {
    title: {
      rowStart: 5,
    },
    columnStart: "E",
    length: 5,
  },
  timetable:
    env.NEXT_PUBLIC_UNIVERSITY === "RGSU"
      ? [
          { index: 1, start: "08:30", end: "10:00" },
          { index: 2, start: "10:10", end: "11:40" },
          { index: 3, start: "12:10", end: "13:40" },
          { index: 4, start: "13:50", end: "15:20" },
          { index: 5, start: "15:30", end: "17:00" },
          { index: 6, start: "17:10", end: "18:40" },
        ]
      : [
          { index: 1, start: "08:00", end: "09:35" },
          { index: 2, start: "09:45", end: "11:20" },
          { index: 3, start: "11:50", end: "13:25" },
          { index: 4, start: "13:35", end: "15:10" },
          { index: 5, start: "15:40", end: "17:15" },
          { index: 6, start: "17:25", end: "19:00" },
          { index: 7, start: "19:00", end: "20:30" },
        ],
};

export default config;
