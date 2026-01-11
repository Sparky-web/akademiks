import { LessonParsed } from "~/lib/utils/schedule/flatten-schedule";

export type LessonsGrouped = {
  startDay: string;
  slots: {
    startIndex: number;
    lessons: LessonParsed[];
  }[];
}[];

export type LessonUpdate = {
  from: LessonParsed | null;
  to: LessonParsed | null;
};
