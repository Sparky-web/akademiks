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
                                    const lessons = day?.lessons.filter(lesson => lesson.index === i + 1) as Lesson || []

                                    const activeLessonId = useActiveLessonId(day?.lessons || [])

                                    return <TableCell key={dayI} className="min-w-[250px] min-h-[150px] h-[150px] align-top p-3 border-x-border border">
                                        <div className="grid content-between h-full items-between">
                                            <div className="flex gap-1">
                                                {!!lessons.length && lessons.map((lesson, index) => (
                                                    <DesktopLesson key={index} lesson={{...lesson, type: props.schedule.type}} />
                                                ))}

                                                {!lessons.length && <span className="text-xs text-muted-foreground">нет пары</span>}
                                            </div>
                                            {!!lessons.length && lessons.find(e => e.id === activeLessonId) && <ActiveIndicatiorDesktop start={lessons[0].start} end={lessons[0].end} />}
                                        </div>
                                    </TableCell>
                                })}
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
            <ScrollBar orientation='horizontal' />
        </ScrollArea>
    )
}