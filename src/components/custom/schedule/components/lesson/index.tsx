import { Prisma } from "@prisma/client";
import { Clock, User, Users } from "lucide-react";
import DateTime from "~/lib/utils/datetime";
import { Badge } from "~/components/ui/badge";
import { type Lesson } from "~/types/schedule";
import ActiveIndicatior from "./active-indicatior";
import { cn } from "~/lib/utils";
import { MapPin } from "lucide-react";
import { Slot } from "../day";
import React from "react";
import { Separator } from "~/components/ui/separator";

interface LessonProps {
  slot: Slot;
  type: "student" | "teacher" | "classroom";
}

export default function Lesson({ slot, type }: LessonProps) {
  return (
    <div
      className={cn(
        "bg-card grid gap-2 rounded-xl px-5 pt-4 shadow-sm",
        !slot.isActive && "pb-4",
      )}
    >
      <div className="grid gap-1 font-medium">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {slot.index || ""} пара
          </span>
          <div className="bg-muted-foreground h-1 w-1 rounded-full"></div>
          <span className="text-muted-foreground text-sm">
            {DateTime.fromJSDate(slot.start).toLocaleString(
              DateTime.TIME_24_SIMPLE,
            )}
            &nbsp;-&nbsp;
            {DateTime.fromJSDate(slot.end).toLocaleString(
              DateTime.TIME_24_SIMPLE,
            )}
          </span>
        </div>
      </div>
      <div className="grid gap-3">
        {slot.lessonsInSlot.map((lesson, i) => (
          <React.Fragment key={lesson.id}>
            {i > 0 && <Separator className="mt-1" />}
            <div className="grid gap-3">
              <h2 className="text-lg font-semibold">{lesson.title}</h2>
              {type !== "classroom" && (
                <div className="flex items-baseline gap-2">
                  <div className="text-muted-foreground text-sm">
                    Аудитория:
                  </div>

                  <Badge size={"sm"} className="text-white">
                    {lesson.Classroom?.name}
                  </Badge>
                </div>
              )}
              {lesson.subgroup && (
                <span className="text-sm font-medium">
                  Подгруппа: {lesson.subgroup}
                </span>
              )}
              <div className="flex gap-2">
                {(type === "classroom" || type === "student") && (
                  <div className="text-muted-foreground flex content-center items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    {lesson.Teacher?.name}
                  </div>
                )}
                {(type === "classroom" || type === "teacher") &&
                  lesson.Group && (
                    <div className="text-muted-foreground flex content-center items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      {lesson.Group?.title}
                    </div>
                  )}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      {slot.isActive && <div className="h-0.5"></div>}
      {slot.isActive && <ActiveIndicatior start={slot.start} end={slot.end} />}
    </div>
  );
}
