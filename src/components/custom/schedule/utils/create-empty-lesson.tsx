import { Group } from "@prisma/client"
import { Duration } from "luxon"
import DateTime from "~/lib/utils/datetime"
import config from "~/lib/utils/schedule/config"
import { Teacher } from "~/types/schedule"

interface CreateEmptyLessonProps {
    teacher?: Teacher,
    group?: Group,
    startDay: Date,
    lessonIndex: number
}


export default function createEmptyLesson({
    teacher, group, lessonIndex, startDay: _startDay
}: CreateEmptyLessonProps) {
    const startDay = DateTime.fromJSDate(_startDay)

    const start = startDay.plus(Duration.fromISOTime(config.timetable[lessonIndex - 1].start))
    const end = startDay.plus(Duration.fromISOTime(config.timetable[lessonIndex - 1].end))

    console.log(start.toJSDate(), end.toJSDate(), startDay.toJSDate(), _startDay)

    return ({
        title: null,
        index: lessonIndex,
        startDay: _startDay,
        start: start.toJSDate(),
        end: end.toJSDate(),
        classroomId: null,
        isEditing: true,
        ...(group ? { Group: group, teacherId: null } : {}),
        ...(teacher ? { Teacher: teacher, teacherId: teacher.id } : {}),
    })
}