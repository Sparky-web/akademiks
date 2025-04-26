import DateTime from "~/lib/utils/datetime";
import {
  formatDate,
  formatTime,
} from "~/app/lk/add-schedule/_lib/componetns/summary";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { Lesson, Schedule } from "~/types/schedule";
import DesktopLesson from "./lesson/desktop-lesson";
import { useAppSelector } from "~/app/_lib/client-store";
import { Button } from "~/components/ui/button";
import { EyeOff, LoaderIcon, Plus } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import createEmptyLesson from "../utils/create-empty-lesson";
import { sanitizeLesson } from "../utils/sanitize-lesson";
import _ from "lodash";
import { LessonParsed } from "~/lib/utils/schedule/flatten-schedule";
import { api } from "~/trpc/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isLessonsEqual } from "../utils/is-lessons-equal";
import { UpdateReport } from "./update-report";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { FormState } from "@tanstack/react-form";
import { useRouter } from "next/navigation";

interface ScheduleProps {
  schedule: Schedule;
  weekStart: Date;
}

const useConfirmNavigation = (hasUnsavedChanges: boolean) => {
  const router = useRouter();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
      }
    };

    const originalPush = router.push;

    router.push = (url: string, options?: NavigateOptions) => {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm(
          "Внимание! Вы не сохранили изменения. Продолжить?",
        );
        if (confirmLeave) {
          originalPush(url, options);
        }
      } else {
        originalPush(url, options);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.push = originalPush;
    };
  }, [router, hasUnsavedChanges]);
};

export default function DesktopScheduleNew({
  schedule,
  weekStart,
}: ScheduleProps) {
  const { data, type } = schedule;

  const days = getDays(weekStart);

  const formValues = scheduleToFormValues(schedule, weekStart);

  const [result, setResult] = useState(null);

  const { mutateAsync: updateSchedule } =
    api.schedule.updateFromAdmin.useMutation();

  const user = useAppSelector((e) => e.user.user);

  const { data: visibility, isPending: isPendingVisibility } =
    api.schedule.getIsVisible.useQuery(
      {
        start: weekStart,
        end: DateTime.fromJSDate(weekStart).plus({ week: 1 }).toJSDate(),
      },
      {
        enabled: !!user?.isAdmin,
      },
    );

  const utils = api.useUtils();

  const form = useForm({
    defaultValues: formValues,
    onSubmit: async (values) => {
      try {
        setResult(null);
        const sanitized = sanitizeFormValues(values.value, formValues);
        const data = await updateSchedule({
          shouldDisplayForStudents: displayForStudents,
          updates: sanitized,
        });
        form.reset();
        utils.schedule.get.invalidate();
        toast.success("Расписание сохранено");
        setResult(data);
      } catch (e) {
        toast.error("Ошибка сохранения расписания: " + e.message);
      }
    },
  });

  const [displayForStudents, setDisplayForStudents] = useState(false);

  useEffect(() => {
    if (typeof visibility === "undefined") return;

    setDisplayForStudents(
      visibility.isScheduleExists ? visibility.isVisible : false,
    );
  }, [visibility]);

  const isAdmin = useAppSelector((state) => state.user.user?.isAdmin);

  return (
    <div className="grid gap-6">
      {isAdmin && (
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium">
            Всего пар на неделе: {data.flatMap((e) => e.lessons).length}
          </div>
          {!isPendingVisibility &&
            visibility?.isScheduleExists &&
            !visibility.isVisible && (
              <>
                <span>·</span>
                <div className="flex items-center gap-2 text-sm">
                  <EyeOff className="h-4 w-4" />
                  Расписание скрыто для студентов
                </div>
              </>
            )}
        </div>
      )}
      <ScrollArea className="bg-card relative h-[80dvh] w-full max-w-full rounded-lg">
        <Table className="">
          <TableHeader className="bg-muted sticky top-0 z-20">
            <TableRow className="hover:bg-muted">
              <TableHead className="bg-muted sticky left-0 z-10 p-3">
                №
              </TableHead>
              {days.map((day, i) => {
                const isToday =
                  day.toISOString() ===
                  DateTime.now().startOf("day").toJSDate().toISOString();

                return (
                  <TableHead
                    key={i}
                    className={cn(
                      "min-h-[100px] min-w-[200px] p-3",
                      isToday && "bg-primary/10 text-primary",
                    )}
                  >
                    <div className="text-foreground grid gap-1">
                      <span>
                        {DateTime.fromJSDate(day)
                          .setLocale("ru")
                          .toFormat("cccc")}
                      </span>
                      <span className="text-xs">
                        {DateTime.fromJSDate(day).toLocaleString(
                          DateTime.DATE_SHORT,
                        )}
                      </span>
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {new Array(7).fill("").map((e, i) => {
              return (
                <TableRow key={i} className="hover:bg-inherit">
                  <TableCell className="bg-muted sticky left-0 z-10 p-3">
                    {i + 1}
                  </TableCell>
                  {Array(6)
                    .fill("")
                    .map((_, dayI) => {
                      const key = `lessons.${dayI}_${i}`;

                      return (
                        <form.Field
                          name={key}
                          key={dayI}
                          key={key}
                          mode="array"
                        >
                          {(field) => {
                            return (
                              <TableCell
                                key={dayI}
                                className="border-x-border relative h-[150px] min-h-[150px] min-w-[250px] border p-0 align-top"
                              >
                                <div className="grid h-full">
                                  <div className="flex h-full">
                                    {!!field.state.value?.length &&
                                      field.state.value.map((_, index) => (
                                        <DesktopLesson
                                          lessonFormKey={key + `[${index}]`}
                                          key={index}
                                          initialLesson={
                                            formValues.lessons[
                                              `${dayI}_${i}`
                                            ]?.[index]
                                          }
                                          type={type}
                                          form={form}
                                        />
                                      ))}

                                    {!field.state.value?.length && (
                                      <span className="text-muted-foreground p-3 text-xs">
                                        нет пары
                                      </span>
                                    )}
                                  </div>

                                  {/* {!!field.state.value?.length && field.state.value?.find(e => e && e.id === activeLessonId) && <ActiveIndicatiorDesktop start={field.state.value?.[0].start} end={field.state.value?.[0].end} />} */}
                                  {isAdmin && (
                                    <div className="absolute right-2 bottom-2">
                                      <Button
                                        onClick={() =>
                                          field.pushValue(
                                            createEmptyLesson({
                                              teacher: schedule.teacher,
                                              group: schedule.group,
                                              startDay: days[dayI],
                                              lessonIndex: i + 1,
                                            }),
                                          )
                                        }
                                        variant="tenary"
                                        size={"xs"}
                                        className="bg-purple-500/5 text-purple-500 hover:bg-purple-500/10 hover:text-purple-500"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            );
                          }}
                        </form.Field>
                      );
                    })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {user?.isAdmin ? (
        <form.Subscribe selector={(form) => [form.isSubmitting, form.values]}>
          {([isSubmitting, values]) => {
            const isChanged = getIsChanged(formValues, values);

            useConfirmNavigation(isChanged);
            if (!isChanged) return null;

            return (
              <div className="grid gap-4">
                <Button
                  onClick={() => form.handleSubmit()}
                  className="max-w-[300px]"
                  disabled={!isChanged || isSubmitting}
                >
                  {isSubmitting && (
                    <LoaderIcon className="h-4 w-4 animate-spin" />
                  )}
                  Сохранить
                </Button>
              </div>
            );
          }}
        </form.Subscribe>
      ) : undefined}

      {result && (
        <UpdateReport
          data={result}
          isOpen={!!result}
          onOpenChange={() => setResult(null)}
        />
      )}
    </div>
  );
}

const getIsChanged = (formValues: FormSchedule, values: FormSchedule) => {
  const sanitized1 = Object.values(values.lessons)
    .flat()
    .map((e) => sanitizeLesson(e));
  const sanitized2 = Object.values(formValues.lessons)
    .flat()
    .map((e) => sanitizeLesson(e));
  return JSON.stringify(sanitized1) !== JSON.stringify(sanitized2);
};

const sanitizeFormValues = (
  formValues: FormSchedule,
  initialValues: FormSchedule,
): LessonParsed[] => {
  const initial = Object.values(initialValues.lessons).flat();

  return Object.values(formValues.lessons)
    .flat()
    .filter((e) => {
      if (!e.id && e.isDeleted) return false;

      const foundInitial = initial.find((el) => el.id === e.id);

      if (e.id && foundInitial && isLessonsEqual(e, foundInitial)) {
        return false;
      }

      return true;
    })
    .map((e) => {
      if (
        !e.isDeleted &&
        (!e ||
          !e.title ||
          !e.start ||
          !e.end ||
          !e.Teacher?.name ||
          !e.Group?.title ||
          !e.Classroom?.name)
      )
        throw new Error("Не все поля заполнены");

      return {
        ...e,
        id: e.id,
        index: e.index,
        start: e.start,
        end: e.end,
        title: e.title,
        group: e.Group?.title,
        subgroup: e.subgroup,
        teacher: e.Teacher?.name,
        classroom: e.Classroom?.name,
      };
    });
};

const getDays = (weekStart: Date) => {
  const days = [];
  for (let i = 0; i < 6; i++) {
    days.push(DateTime.fromJSDate(weekStart).plus({ days: i }).toJSDate());
  }
  return days;
};

export const scheduleToFormValues = (schedule: Schedule, weekStart: Date) => {
  const days = getDays(weekStart);

  const values = {
    type: schedule.type,
    lessons: {} as { [key: string]: Lesson[] },
  };

  for (let d = 0; d < days.length; d++) {
    const day = days[d];
    for (let i = 0; i < 7; i++) {
      const foundDay = schedule.data.find(
        (e) => e.start.toISOString() === day.toISOString(),
      );
      if (!foundDay) continue;

      const foundLessons = foundDay.lessons.filter((e) => e.index === i + 1);

      if (!foundLessons.length) continue;

      values.lessons[`${d}_${i}`] = foundLessons;
    }
  }

  return values;
};

type FormSchedule = ReturnType<typeof scheduleToFormValues>;
