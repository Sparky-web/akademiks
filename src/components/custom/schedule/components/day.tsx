import { type Day } from "~/types/schedule";
import Lesson from "./lesson";
import useActiveLessonId from "../utils/use-active-lesson-id";

interface DayProps {
  day: Day;
  type: "student" | "teacher";
}

import { type Lesson as LessonType } from "~/types/schedule";

export type Slot = {
  isActive: boolean;
  index: number;
  start: Date;
  end: Date;
  lessonsInSlot: LessonType[];
};

export default function Day(props: DayProps) {
  const activeLessonId = useActiveLessonId(props.day.lessons);

  const lessons: Slot[] = [];

  for (let lesson of props.day.lessons) {
    const found = lessons.find((e) => e.index === lesson.index);

    if (found) {
      if (activeLessonId === lesson.id) {
        found.isActive = true;
      }
      found.lessonsInSlot.push(lesson);
    } else {
      lessons.push({
        isActive: activeLessonId === lesson.id,
        index: lesson.index,
        start: lesson.start,
        end: lesson.end,
        lessonsInSlot: [lesson],
      });
    }
  }

  return (
    <div className="grid gap-4">
      {!!props.day.lessons.length &&
        lessons.map((lesson, i) => (
          <Lesson key={i} slot={lesson} type={props.type} />
        ))}
    </div>
  );
}
