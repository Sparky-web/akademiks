import { Lesson } from "@prisma/client"
import DateTime from "~/lib/utils/datetime"
import { db } from "~/server/db"

const getStudentSchedule = async (groupId: string, weekStart: Date, isAdmin: boolean) => {
    const group = await db.group.findUnique({
        where: {
            id: groupId
        }
    })

    if (!group) throw new Error('Не найден группа c id:' + groupId)

    const data = await db.lesson.findMany({
        orderBy: {
            start: 'asc'
        },
        where: {
            Group: {
                id: groupId
            },
            start: {
                gte: weekStart,
                lt: DateTime.fromJSDate(weekStart).plus({ week: 1 }).toJSDate()
            },
            ...(!isAdmin ? {
                shouldDisplayForStudents: true
            } : {})
        },
        include: {
            Teacher: {
                select: {
                    id: true,
                    name: true
                }
            },
            Group: {
                select: {
                    id: true,
                    title: true
                }
            },
            Classroom: true
        }
    })


    const days: {
        start: Date,
        lessons: Lesson[]
    }[] = []

    for (let lesson of data) {
        const foundDay = days.find(day => day.start.toString() === lesson.startDay.toString())

        if (!foundDay) {
            days.push({
                start: lesson.startDay,
                lessons: [lesson]
            })
        } else {
            foundDay.lessons.push(lesson)
        }
    }

    return {
        data: days,
        type: 'student',
        group: group
    }
}

export default getStudentSchedule