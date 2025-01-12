"use client"
import DateTime from "~/lib/utils/datetime"
import { FC, useEffect, useState } from "react"
import { api } from "~/trpc/react"
import Day from "./components/day"
import DayPicker from "./components/day-picker"
import PageTitle from "../page-title"
import EmptyWeek from "./components/empty-week"
import EmptyDay from "./components/empty-day"
import { P } from "~/components/ui/typography"
import { withErrorBoundary } from "../../../app/_lib/utils/error-boundary"
import DesktopSchedule from "./components/desktop"
import WeekSelector from "./components/week-picker-desktop"
import ErrorReportModal from "../errors/report-error"
import Card from "../card"
import { CardTitle } from "../card"
import { AlertCircle } from "lucide-react"

export interface ScheduleProps {
    type: 'student' | 'teacher'
    groupId?: string,
    teacherId?: string
    endTitleElement?: React.ReactNode
}

function Schedule(props: ScheduleProps) {

    const [weekStart, setWeekStart] = useState(DateTime.now().weekday === 7 ?
        DateTime.now().startOf("week").plus({ week: 1 }).toJSDate()
        : DateTime.now().startOf("week").toJSDate())

    const [selectedDayStart, setSelectedDayStart] = useState(
        DateTime.now().weekday === 7 ?
            DateTime.now().startOf('day').plus({ day: 1 }).toJSDate()
            : DateTime.now().startOf('day').toJSDate())

    const [_, { data }] = api.schedule.get.useSuspenseQuery({
        groupId: props.type === 'student' ? props.groupId : undefined,
        teacherId: props.type === 'teacher' ? props.teacherId : undefined,
        weekStart
    }, {
        refetchInterval: 60000
    })

    useEffect(() => {
        if (weekStart.toISOString() !== DateTime.now().startOf("week").toJSDate().toISOString()) {
            setSelectedDayStart(DateTime.fromJSDate(weekStart).startOf('day').toJSDate())
        } else {
            setSelectedDayStart(DateTime.now().startOf('day').toJSDate())
        }
    }, [weekStart])

    if (!data) return 'Загрузка...'

    const foundDay = data.data.find(day => day.start.toISOString() === selectedDayStart.toISOString())

    const isEmpty = !data.data.length || !data.data.find(day => day.lessons.length)

    return (
        <div className="grid gap-6 w-full overflow-hidden">
            <div className="flex gap-3 items-center content-center">
                <PageTitle className="flex gap-4 items-center justify-between w-full">
                    Расписание: {data.type === 'student' ? data.group?.title : data.teacher?.name}
                    {props.endTitleElement}
                </PageTitle>
                <div className="w-fit ml-auto max-lg:hidden">
                    <WeekSelector weekStart={weekStart} onChange={setWeekStart} />
                </div>
            </div>

            <div className="grid gap-6 lg:hidden">
                <DayPicker
                    days={data.data}
                    weekStart={weekStart} onChange={setWeekStart}
                    selectedDayStart={selectedDayStart}
                    onSelectDay={setSelectedDayStart}
                />

                <div className="grid gap-4 mt-4">
                    {isEmpty &&
                        <div className="mt-6">
                            <EmptyWeek onReturn={() => setWeekStart(DateTime.now().startOf('week').toJSDate())} />
                        </div>
                    }

                    {!isEmpty && !foundDay?.lessons.length &&
                        <div className="mt-6">
                            <EmptyDay />
                        </div>
                    }

                    {!isEmpty && foundDay &&
                        <Day day={foundDay} type={props.type} />
                    }

                    {!isEmpty && <P className="font-medium text-sm w-fit py-1 px-3 rounded-xl bg-muted mx-auto mt-3">
                        {DateTime.fromJSDate(selectedDayStart).toLocaleString(DateTime.DATE_HUGE)}
                    </P>}
                </div>
            </div>

            <div className="hidden lg:grid gap-6 w-full overflow-hidden">
                <DesktopSchedule schedule={data} weekStart={weekStart} />
            </div>

            <Card className="bg-amber-500/10 max-w-[400px]">
                {/* <CardTitle className="">
                    <AlertCircle className="w-5 h-5 mr-2 inline-block" />
                    Приложение работает в тестовом режиме
                </CardTitle> */}
                <div className="text-sm">Если вы обнаружили ошибку в расписании, или другую неисправность, пожалуйста нажмите на кнопку ниже.</div>
                <ErrorReportModal />
            </Card>
        </div>
    )
}

export default withErrorBoundary(Schedule)