"use client";

import { useEffect, useState } from "react";
import DateTime from "~/lib/utils/datetime";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import { Clock, MapPin, User, Users, Calendar } from "lucide-react";
import { cn } from "~/lib/utils";
import { Lesson } from "~/types/schedule";

// Types
interface TimeSlot {
  index: number;
  start: string;
  end: string;
}

export function ScheduleTimetableView({
  timetable,
  lessons,
  type,
}: {
  timetable: TimeSlot[];
  lessons: Lesson[];
  type: "student" | "teacher" | "classroom";
}) {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Days of the week in Russian (abbreviated for mobile)
  const daysOfWeek = ["пн", "вт", "ср", "чт", "пт", "сб"];

  // Organize lessons by day and time slot (allowing multiple lessons per slot)
  const organizedLessons = new Map<number, Map<number, Lesson[]>>();

  lessons.forEach((lesson) => {
    const startDay = DateTime.fromJSDate(lesson.startDay);
    const dayOfWeek = startDay.weekday === 7 ? 0 : startDay.weekday - 1;

    if (!organizedLessons.has(dayOfWeek)) {
      organizedLessons.set(dayOfWeek, new Map<number, Lesson[]>());
    }

    const dayLessons = organizedLessons.get(dayOfWeek)!;

    if (!dayLessons.has(lesson.index)) {
      dayLessons.set(lesson.index, []);
    }

    dayLessons.get(lesson.index)!.push(lesson);
  });

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    try {
      window.ym(101414600, "reachGoal", "timetable-view");
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <div className="bg-background text-foreground max-w-full overflow-x-auto">
      <div className="min-w-[360px]">
        {/* Header row with days of the week */}
        <div className="border-border grid grid-cols-[50px_repeat(6,1fr)] border-b">
          <div className="p-1 text-xs"></div>
          {daysOfWeek.map((day, index) => (
            <div
              key={index}
              className="border-border border-l p-2 text-center text-xs font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Time slots rows */}
        {timetable.map((slot) => {
          // Calculate max lessons in any cell for this row to determine if we need to expand height
          let maxLessonsInRow = 0;
          daysOfWeek.forEach((_, dayIndex) => {
            const lessonsCount =
              organizedLessons.get(dayIndex)?.get(slot.index)?.length || 0;
            maxLessonsInRow = Math.max(maxLessonsInRow, lessonsCount);
          });

          // Determine row height based on number of lessons
          const rowHeight =
            maxLessonsInRow > 1 ? `${maxLessonsInRow * 80}px` : "80px";

          return (
            <div
              key={slot.index}
              className={`border-border grid grid-cols-[50px_repeat(6,1fr)] border-b`}
              style={{ minHeight: rowHeight }}
            >
              {/* Time column */}
              <div className="flex flex-col justify-center p-1 font-mono text-xs">
                <div>{slot.start}</div>
                <div>{slot.end}</div>
              </div>

              {/* Days columns */}
              {daysOfWeek.map((_, dayIndex) => {
                const dayLessons =
                  organizedLessons.get(dayIndex)?.get(slot.index) || [];

                return (
                  <div
                    key={dayIndex}
                    className="border-border relative border-l p-0"
                  >
                    <div className="absolute inset-0 p-0">
                      <div className="flex h-full w-full flex-col gap-0.5">
                        {dayLessons.map((lesson, lessonIndex) => (
                          <div
                            key={lessonIndex}
                            className={cn(
                              "bg-primary text-primary-foreground flex cursor-pointer flex-col rounded-sm p-0.5 text-xs dark:text-white",
                              "h-full",
                              lesson.Classroom?.name === "Дистант" &&
                                "bg-purple-600",
                            )}
                            onClick={() => handleLessonClick(lesson)}
                          >
                            <div className="line-clamp-3 font-medium break-words hyphens-auto">
                              {abbreviateTitle(lesson.title)}
                            </div>
                            <div className="mt-auto grid gap-1">
                              {type === "teacher" && (
                                <div className="truncate">
                                  {lesson.Group?.title || "Не указан"}
                                </div>
                              )}
                              {type === "classroom" && (
                                <div className="truncate">
                                  {lesson.Teacher?.name || "Не указан"}
                                </div>
                              )}
                              {type !== "classroom" && (
                                <div className="truncate">
                                  {lesson.Classroom?.name || "Не указан"}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div
        dangerouslySetInnerHTML={{
          __html: `<script>
            ym(101414600, 'reachGoal', 'timetable-view');
        </script>`,
        }}
      />

      {/* Lesson Details Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent>
          {selectedLesson && (
            <div className="mx-auto w-full">
              <DrawerHeader>
                <DrawerTitle>{selectedLesson?.title}</DrawerTitle>
              </DrawerHeader>

              {selectedLesson && (
                <div className="space-y-4 p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-muted-foreground h-4 w-4" />
                    <span>
                      {DateTime.fromJSDate(
                        selectedLesson.startDay,
                      ).toLocaleString(DateTime.DATE_MED)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="text-muted-foreground h-4 w-4" />
                    <span>
                      {DateTime.fromJSDate(selectedLesson.start).toFormat(
                        "HH:mm",
                      )}{" "}
                      -{"   "}
                      {DateTime.fromJSDate(selectedLesson.end).toFormat(
                        "HH:mm",
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="text-muted-foreground h-4 w-4" />
                    <span>
                      Аудитория:{" "}
                      {selectedLesson.Classroom?.name || "Не указана"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="text-muted-foreground h-4 w-4" />
                    <span>{selectedLesson.Teacher?.name || "Не указан"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="text-muted-foreground h-4 w-4" />
                    <span>{selectedLesson.Group?.title || "Не указан"}</span>
                  </div>
                </div>
              )}

              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="tenary">Закрыть</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export function abbreviateTitle(title: string): string {
  if (title.length <= 15) return title;

  return title
    .replace(/[^a-zA-Zа-яА-Я\s]/g, "")
    .split(" ")
    .map((word) =>
      word.length === 1 ? word.charAt(0) : word.charAt(0).toUpperCase(),
    )
    .join("");
}
