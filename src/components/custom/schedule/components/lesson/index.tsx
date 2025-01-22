import { Prisma } from "@prisma/client"
import { Clock, User, Users } from "lucide-react"
import DateTime from "~/lib/utils/datetime"
import { Badge } from "~/components/ui/badge"
import { type Lesson } from "~/types/schedule"
import ActiveIndicatior from "./active-indicatior"
import { cn } from "~/lib/utils"
import { MapPin } from "lucide-react"
import { Slot } from "../day"
import React from "react"
import { Separator } from "~/components/ui/separator"

interface LessonProps {
    slot: Slot
    type: 'student' | 'teacher'
}

export default function Lesson({ slot, type }: LessonProps) {
    return (
        <div className={
            cn("bg-card rounded-xl px-5 pt-4 shadow-sm grid gap-2",
                !slot.isActive && 'pb-4'
            )}>
            <div className="grid gap-1 font-medium ">
                <div className="flex gap-3 items-center">
                    <span className="text-sm text-muted-foreground">{slot.index || ''} пара</span>
                    <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                    <span className="text-sm text-muted-foreground">
                        {DateTime.fromJSDate(slot.start).toLocaleString(DateTime.TIME_24_SIMPLE)}
                        &nbsp;-&nbsp;
                        {DateTime.fromJSDate(slot.end).toLocaleString(DateTime.TIME_24_SIMPLE)}</span>
                </div>
            </div>
            <div className="grid gap-3">
                {slot.lessonsInSlot.map((lesson, i) => (
                    <React.Fragment key={lesson.id}>
                        {i > 0 && <Separator className="mt-1" />}
                        <div className="grid gap-3" >
                            <h2 className="text-lg font-semibold">{lesson.title}</h2>
                            <div className="flex gap-2 items-baseline">
                                <div className="text-sm text-muted-foreground">
                                    Аудитория:
                                </div>
                                <Badge size={'sm'} className="text-white">
                                    {lesson.Classroom?.name}
                                </Badge>
                            </div>
                            {lesson.subgroup && <span className="text-sm font-medium">Подгруппа: {lesson.subgroup}</span>}
                            <div className="flex gap-2">
                                {type === 'student' && <div className="flex gap-2 content-center items-center text-muted-foreground text-sm">
                                    <User className="w-4 h-4" />
                                    {lesson.Teacher?.name}
                                </div>}
                                {type === 'teacher' &&
                                    lesson.Group && <div className="flex gap-2 content-center items-center text-muted-foreground text-sm">
                                        <Users className="w-4 h-4" />
                                        {lesson.Group?.title}
                                    </div>
                                }
                            </div>
                        </div>
                    </React.Fragment>
                ))}
            </div>

            {slot.isActive && <div className="h-0.5"></div>}
            {slot.isActive && <ActiveIndicatior start={slot.start} end={slot.end} />}
        </div>
    )
}