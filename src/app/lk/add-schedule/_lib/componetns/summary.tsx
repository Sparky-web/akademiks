'use client'

import { useState, useMemo } from 'react'
import Card, { CardTitle } from '~/components/custom/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Loader2 } from "lucide-react"
import DateTime from "~/lib/utils/datetime"
import { Button } from '~/components/ui/button'
import { ScrollArea, ScrollBar } from '~/components/ui/scroll-area'


interface ScheduleItem {
    index: number
    title: string
    start: Date
    end: Date
    classroom: string
    teacher: string
    group: string
    subgroup: string | null
}

const weekDays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']

export function formatDate(dateString: string): string {
    const date = DateTime.fromFormat(dateString, 'dd.MM.yyyy').toJSDate()
    const day = weekDays[date.getDay()]
    return `${day}, ${dateString}`
}

export function formatTime(dateString: string): string {
    return DateTime.fromJSDate(new Date(dateString)).toFormat('HH:mm')
    // return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function Component({ scheduleData }: { scheduleData?: ScheduleItem[] }) {
    const [activeTab, setActiveTab] = useState('summary')

    const summary = useMemo(() => {
        if (!scheduleData) return null

        const groupCount: Record<string, number> = {}
        const classroomCount: Record<string, number> = {}
        const teacherCount: Record<string, number> = {}

        let maxDate = 0
        let minDate = Infinity

        scheduleData.forEach(item => {
            if (item.title === null) return

            maxDate = Math.max(maxDate, new Date(item.start).getTime())
            minDate = Math.min(minDate, new Date(item.start).getTime())

            groupCount[item.group] = (groupCount[item.group] || 0) + 1
            classroomCount[item.classroom] = (classroomCount[item.classroom] || 0) + 1
            teacherCount[item.teacher] = (teacherCount[item.teacher] || 0) + 1
        })

        return {
            groupCount,
            classroomCount,
            teacherCount,
            totalCount: scheduleData.filter(e => e.title).length,
            minDate: DateTime.fromMillis(minDate).toFormat('dd.MM.yyyy'),
            maxDate: DateTime.fromMillis(maxDate).toFormat('dd.MM.yyyy'),
        }
    }, [scheduleData])

    const fullSchedule = useMemo(() => {
        if (!scheduleData) return null

        const schedule: Record<string, Record<string, (ScheduleItem | [ScheduleItem, ScheduleItem])[]>> = {}
        const groups = new Set<string>()
        let maxIndex = 0

        scheduleData.forEach(item => {
            if (item.title === null) return

            const date = new Date(item.start).toLocaleDateString()
            if (!schedule[date]) {
                schedule[date] = {}
            }
            if (!schedule[date][item.group]) {
                schedule[date][item.group] = []
            }

            const existingItem = schedule[date][item.group][item.index - 1]
            if (existingItem && Array.isArray(existingItem) && item.subgroup) {
                existingItem[parseInt(item.subgroup) - 1] = item
            } else if (existingItem && !Array.isArray(existingItem) && item.subgroup) {
                schedule[date][item.group][item.index - 1] = [existingItem, item]
            } else {
                schedule[date][item.group][item.index - 1] = item
            }

            groups.add(item.group)
            maxIndex = Math.max(maxIndex, item.index)
        })

        // Fill empty slots
        Object.values(schedule).forEach(dateSchedule => {
            Object.keys(dateSchedule).forEach(group => {
                const filledLessons = Array(maxIndex).fill(null)
                dateSchedule[group].forEach((lesson, index) => {
                    filledLessons[index] = lesson
                })
                dateSchedule[group] = filledLessons
            })
        })

        return { schedule, groups: Array.from(groups).sort(), maxIndex }
    }, [scheduleData])

    if (!scheduleData) {
        return
    }

    if (scheduleData.length === 0) {
        return
    }

    return (
        <Card className="max-w-full overflow-hidden">
            <CardTitle>Предпросмотр расписания</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab} className='max-w-full overflow-hidden'>
                <TabsList>
                    <TabsTrigger value="summary">Сводка</TabsTrigger>
                    <TabsTrigger value="fullSchedule">Полное расписание</TabsTrigger>
                </TabsList>
                <TabsContent value="summary">
                    <div className="grid gap-4">
                        <div className="gap-2 mt-2 font-medium">
                            <div className=''>Всего пар: {summary!.totalCount}</div>
                            <div className=''>Период: {summary!.minDate} - {summary!.maxDate}</div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SummaryCard title="По группам" data={summary!.groupCount} />
                            <SummaryCard title="По кабинетам" data={summary!.classroomCount} />
                            <SummaryCard title="По преподавателям" data={summary!.teacherCount} />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="fullSchedule" className=''>
                    <div className='overflow-x-auto border rounded-md max-w-full w-full'>
                        <ScrollArea className="h-[80dvh] relative w-full">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-20 bg-background">
                                    <tr>
                                        <th className="border p-2 text-left sticky left-0 z-20 bg-background">Дата</th>
                                        {fullSchedule!.groups.map((group) => (
                                            <th key={group} className="border p-2 text-left">
                                                {group}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(fullSchedule!.schedule).map(([date, groupSchedule]) => (
                                        <tr key={date} className='border-t-2 border-b-2 border-gray-500'>
                                            <td className="border p-2 font-medium sticky left-0 z-10 bg-background align-top ">
                                                {formatDate(date)}
                                            </td>
                                            {fullSchedule!.groups.map(group => (
                                                <td key={`${date}-${group}`} className="border p-0  min-w-[250px] align-top ">
                                                    <div className="grid grid-cols-1 divide-y">
                                                        {groupSchedule[group]?.map((item, index) => (
                                                            <div key={index} className="p-2 min-h-[120px] min-w-[250px] max-h-[120px] overflow-auto">
                                                                {Array.isArray(item) ? (
                                                                    <div className="grid grid-cols-2 break-words hyphens-auto">
                                                                        {item.map((subItem, subIndex) => (
                                                                            <div key={subIndex} className="flex-1 p-1">
                                                                                <div className="font-medium text-xs">{subItem.title}</div>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    {formatTime(subItem.start)} - {formatTime(subItem.end)}
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    {subItem.classroom}, {subItem.teacher}
                                                                                </div>
                                                                                <div className="text-xs font-medium">Подгруппа {subItem.subgroup}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : item ? (
                                                                    <>
                                                                        <div className="font-medium text-sm">{item.title}</div>
                                                                        <div className="text-xs text-muted-foreground">
                                                                            {formatTime(item.start)} - {formatTime(item.end)}
                                                                        </div>
                                                                        <div className="text-xs text-muted-foreground">{item.classroom}, {item.teacher}</div>
                                                                        {item.subgroup && <div className="text-xs font-medium">Подгруппа {item.subgroup}</div>}
                                                                    </>
                                                                ) : (
                                                                    <div className="text-sm text-muted-foreground">Нет пары</div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <ScrollBar orientation='horizontal' />
                        </ScrollArea>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    )
}

function SummaryCard({ title, data }: { title: string, data: Record<string, number> }) {
    const [displayFull, setDisplayFull] = useState(false)

    return (
        <Card >
            <CardTitle className='text-base'>{title}</CardTitle>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className='p-1'>Название</TableHead>
                        <TableHead className='p-1'>Количество пар</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(data).sort(
                        (a, b) => b[1] - a[1]
                    ).slice(0, displayFull ? Object.entries(data).length : 10).map(([name, count]) => (
                        <TableRow key={name} className='p-1'>
                            <TableCell className='p-1'>{name}</TableCell>
                            <TableCell className='p-1'>{count}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {!displayFull && Object.entries(data).length > 10 && <Button variant={'ghost'} className='text-xs text-center mt-2 w-full' onClick={() => setDisplayFull(true)}>Показать все</Button>}
        </Card>
    )
}

export default Component