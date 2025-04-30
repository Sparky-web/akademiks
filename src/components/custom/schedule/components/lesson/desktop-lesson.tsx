import { Group, UserIcon, UsersIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "~/app/lk/add-schedule/_lib/componetns/summary";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { type Lesson } from "~/types/schedule";
import ActionButtons from "./action-buttons";
import { cn } from "~/lib/utils";
import { useAppSelector } from "~/app/_lib/client-store";
import CreateLessonForm from "./forms/lesson-form";
import { FormApi, ReactFormApi } from "@tanstack/react-form";
import { classroom } from "googleapis/build/src/apis/classroom";
import { isLessonsEqual } from "../../utils/is-lessons-equal";

type LessonProps = {
  type: "student" | "teacher" | "classroom";
  form: ReactFormApi<any, any>;
  initialLesson?: Lesson;
  lessonFormKey: string;
};

export default function DesktopLesson(props: LessonProps) {
  const { form, type, lessonFormKey, initialLesson } = props;

  const isAdmin = useAppSelector((state) => state.user.user?.isAdmin);

  return (
    <form.Field name={props.lessonFormKey}>
      {(field) => (
        <div
          className={cn(
            "relative grid h-full w-full min-w-[225px] content-start gap-1 p-3",
            !field.state.value?.id && "bg-green-500/5",
            initialLesson &&
              !isLessonsEqual(field.state.value, initialLesson) &&
              "bg-amber-500/5",
            field.state.value?.isDeleted && "bg-red-500/5 line-through",
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <div className="items-top flex justify-between gap-2">
                {type === "student" && (
                  <div className="line-clamp-3 overflow-hidden text-sm font-medium">
                    {field.state.value.title}
                  </div>
                )}

                {type === "teacher" && (
                  <div className="flex items-center gap-2 font-medium">
                    <UsersIcon className="h-4 w-4" />
                    {field.state.value.Group?.title}
                  </div>
                )}

                {type === "classroom" && (
                  <div className="flex items-center gap-2 font-medium">
                    <UserIcon className="h-4 w-4" />
                    {field.state.value.Teacher?.name}
                  </div>
                )}

                {isAdmin && !field.state.value.isDeleted && (
                  <ActionButtons
                    field={field}
                    form={form}
                    lessonFormKey={props.lessonFormKey}
                  />
                )}
              </div>

              {(type === "classroom" || type === "teacher") && (
                <TooltipTrigger asChild>
                  <div className="line-clamp-2 overflow-hidden text-xs">
                    {field.state.value.title}
                  </div>
                </TooltipTrigger>
              )}
              <TooltipContent className="max-w-[300px] text-xs">
                {field.state.value.title}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {field.state.value.isEditing && (
            <CreateLessonForm
              form={form}
              type={type}
              field={field}
              lessonFormKey={props.lessonFormKey}
            />
          )}

          {!field.state.value.isEditing && (
            <>
              <div className="text-muted-foreground text-xs">
                {formatTime(field.state.value.start)} -{" "}
                {formatTime(field.state.value.end)}
              </div>
              {type === "classroom" && (
                <div className="text-muted-foreground text-xs">
                  {field.state.value.Group?.title || "Не указано"}
                </div>
              )}
              {type !== "classroom" && (
                <div className="text-muted-foreground text-xs">
                  {field.state.value.Classroom?.name || "Не указано"}
                  {type === "student" &&
                    ", " + (field.state.value.Teacher?.name || "Не указано")}
                </div>
              )}

              {field.state.value.subgroup && (
                <div className="text-xs font-medium">
                  Подгруппа {field.state.value.subgroup}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </form.Field>
  );
}
