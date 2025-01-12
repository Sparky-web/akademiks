import { Lesson } from "@prisma/client"
import DateTime from "~/lib/utils/datetime"
import { db } from "~/server/db"

const getTeacherSchedule = async (teacherId: string, weekStart: Date) => {
    const teacher = await db.teacher.findUnique({
        where: {
            id: teacherId
        }
    })

    if(!teacher) throw new Error('Не найден преподаватель c id:' + teacherId)

    // const data = await db.day.findMany({
    //     orderBy: {
    //         start: 'asc'
    //     },
    //     where: {
    //         teacherId,
    //         start: {
    //             gte: weekStart,
    //             lt: DateTime.fromJSDate(weekStart).plus({ week: 1 }).toJSDate()
    //         }
    //     },
    //     include: {
    //         lessons: {
    //             orderBy: {
    //                 index: 'asc'
    //             },
    //             include: {
    //                 Groups: {
    //                     select: {
    //                         id: true,
    //                         title: true
    //                     }
    //                 },
    //                 Teacher: {
    //                     select: {
    //                         id: true,
    //                         name: true
    //                     }
    //                 },
    //                 Classroom: true
    //             }
    //         }
    //     }
    // })

    const data = await db.lesson.findMany({
        orderBy: {
            start: 'asc'
        },
        where: {
            Teacher: {
                id: teacherId
            },
            start: {
                gte: weekStart,
                lt: DateTime.fromJSDate(weekStart).plus({ week: 1 }).toJSDate()
            }
        },
        include: {
            Group: {
                select: {
                    id: true,
                    title: true
                }
            },
            Teacher: {
                select: {
                    id: true,
                    name: true
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
        type: 'teacher',
        teacher: teacher
    }
}

export default getTeacherSchedule