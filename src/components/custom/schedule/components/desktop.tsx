import DateTime from "~/lib/utils/datetime"
import { formatDate, formatTime } from "~/app/lk/add-schedule/_lib/componetns/summary";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { Lesson, Schedule } from "~/types/schedule";
import useActiveLessonId from "../utils/use-active-lesson-id";
import ActiveIndicatiorDesktop from "./lesson/active-indicator-desktop";
import DesktopLesson from "./lesson/desktop-lesson";
import { useAppSelector } from "~/app/_lib/client-store";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import createEmptyLesson from "../utils/create-empty-lesson";
import { scheduleToFormValues } from "./desktop-new";
import { useState } from "react";

interface ScheduleProps {
    schedule: Schedule
    weekStart: Date
}


export default function DesktopSchedule(props: ScheduleProps) {
    const { data } = props.schedule

    const days = []
    for (let i = 0; i < 6; i++) {
        days.push(DateTime.fromJSDate(props.weekStart).plus({ days: i }).toJSDate())
    }

    const [result, setResult] = useState(null)

    const formValues = {
        type: props.schedule.type,
        days: days.map(e => ({
            start: e,
            lessons: new Array(7).fill('').map((_, i) => {
                const lessons = data.find(day => day.start.toISOString() === e.toISOString())?.lessons
                return lessons?.filter(lesson => lesson.index === i + 1)
            })
        }))
    }

    const form = useForm({
        defaultValues: formValues
    })

    const isAdmin = useAppSelector(state => state.user.user?.isAdmin)

    return (
        <ScrollArea className="max-w-full w-full h-[80dvh] bg-card rounded-lg relative">
            <Table className="">
                <TableHeader className="sticky top-0 z-20 bg-muted">
                    <TableRow className="hover:bg-muted">
                        <TableHead className="sticky left-0 z-10 bg-muted  p-3">
                            №
                        </TableHead>
                        {days.map((day, i) => {
                            const isToday = day.toISOString() === DateTime.now().startOf('day').toJSDate().toISOString()

                            return (
                                <TableHead key={i} className={cn("min-w-[200px] min-h-[100px] p-3", isToday && 'bg-primary/10 text-primary')}>
                                    <div className="grid gap-1 text-foreground">
                                        <span>
                                            {DateTime.fromJSDate(day).setLocale('ru').toFormat('cccc')}
                                        </span>
                                        <span className="text-xs">
                                            {DateTime.fromJSDate(day).toLocaleString(DateTime.DATE_SHORT)}
                                        </span>
                                    </div>
                                </TableHead>
                            )
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {new Array(7).fill('').map((e, i) => {
                        return (
                            <TableRow key={i} className="hover:bg-card">
                                <TableCell className="sticky left-0 z-10 bg-muted p-3">
                                    {i + 1}
                                </TableCell>
                                {Array(6).fill("").map((_, dayI) => {
                                    const day = data.find(day => day.start.toISOString() === DateTime.fromJSDate(days[dayI]).toJSDate().toISOString())
                                    const activeLessonId = useActiveLessonId(day?.lessons || [])
                                    const formKey = `days[${dayI}].lessons[${i}]`

                                    return (
                                        <form.Field name={formKey} key={dayI} >
                                            {(field) => {
                                                if (typeof field.state.value === 'object') field.state.value = Object.values(field.state.value)

                                                return (<TableCell key={dayI} className="min-w-[250px] min-h-[150px] h-[150px] align-top p-0 border-x-border border relative">
                                                    <div className="grid h-full">
                                                        <div className="flex h-full">
                                                            {/* {!!lessons.length && lessons.map((lesson, index) => (
                                                            <DesktopLesson key={index} lesson={{ ...lesson, type: props.schedule.type }} />
                                                        ))} */}

                                                            {!!field.state.value?.length && field.state.value.map((_, index) => (
                                                                <DesktopLesson
                                                                    lessonFormKey={formKey + `[${index}]`}
                                                                    key={index}
                                                                    type={props.schedule.type}
                                                                    form={form} />
                                                            ))}

                                                            {!field.state.value?.length && <span className="text-xs text-muted-foreground p-3">нет пары</span>}
                                                        </div>

                                                        {!!field.state.value?.length && field.state.value?.find(e => e && e.id === activeLessonId) && <ActiveIndicatiorDesktop start={field.state.value?.[0].start} end={field.state.value?.[0].end} />}

                                                        {isAdmin && <div className="right-2 bottom-2 absolute">
                                                            <Button
                                                                onClick={() => field.pushValue(createEmptyLesson({
                                                                    teacher: props.schedule.teacher,
                                                                    group: props.schedule.group,
                                                                    startDay: days[dayI],
                                                                    lessonIndex: i + 1
                                                                }))}
                                                                // onClick={() => props.onSave()}
                                                                variant="tenary" size={'xs'} className="text-purple-500 bg-purple-500/5 hover:bg-purple-500/10 hover:text-purple-500">
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>}
                                                    </div>
                                                </TableCell>
                                                )
                                            }
                                            }
                                        </form.Field>
                                    )
                                })}
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
            <ScrollBar orientation='horizontal' />
        </ScrollArea >
    )
}