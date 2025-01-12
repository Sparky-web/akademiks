import DateTime from "~/lib/utils/datetime"

import { LessonParsed } from "~/lib/utils/schedule/flatten-schedule";
import { P } from "~/components/ui/typography";
import translit from "~/lib/utils/translit";
import { db } from "~/server/db";
import pMap from 'p-map';
import getScheduleDifference from "./get-schedule-difference";
import { Lesson } from "~/types/schedule";
import notify from "./notify";

export interface ResultItem {
    type: "add" | "update" | "delete",
    status: "success" | "error",
    item?: Lesson | LessonParsed,
    inputItem?: Lesson | LessonParsed,
    error?: string
}

export default async function updateSchedule(schedule: LessonParsed[]) {
    // const groups = await db.group.findMany({
    //     select: {
    //         id: true,
    //         title: true
    //     }
    // })

    // const teachers = await db.teacher.findMany({
    //     select: {
    //         id: true,
    //         name: true
    //     }
    // })

    // const classrooms = await db.classroom.findMany({
    //     select: {
    //         id: true,
    //         name: true
    //     }
    // })

    const difference = await getScheduleDifference(schedule)


    const result: ResultItem[] = []

    for (let lesson of difference) {
        if ((!lesson.from) && lesson.to) {
            try {
                const item = await db.lesson.create({
                    data: {
                        title: lesson.to.title,
                        start: lesson.to.start,
                        end: lesson.to.end,
                        index: lesson.to.index,
                        startDay: DateTime.fromJSDate(lesson.to.start).startOf('day').toJSDate(),
                        subgroup: lesson.to.subgroup,
                        Group: {
                            connectOrCreate: {
                                where: {
                                    id: translit(lesson.to.group),
                                    title: lesson.to.group
                                },
                                create: {
                                    id: translit(lesson.to.group),
                                    title: lesson.to.group
                                }
                            }
                        },
                        Teacher: {
                            connectOrCreate: {
                                where: {
                                    id: translit(lesson.to.teacher || 'Не указан'),
                                    name: lesson.to.teacher || 'Не указан'
                                },
                                create: {
                                    id: translit(lesson.to.teacher || 'Не указан'),
                                    name: lesson.to.teacher || 'Не указан'
                                }
                            }
                        },
                        Classroom: {
                            connectOrCreate: {
                                where: {
                                    name: lesson.to.classroom 
                                },
                                create: {
                                    name: lesson.to.classroom
                                }
                            }
                        },
                    },
                    include: {
                        Group: true,
                        Teacher: true,
                        Classroom: true
                    }
                })
                result.push({
                    type: "add",
                    status: "success",
                    item: item
                })
            } catch (e) {
                result.push({
                    type: "add",
                    status: "error",
                    inputItem: lesson.to,
                    error: e.message
                })
            }
        } else if (lesson.from && lesson.to) {
            try {
                const found = await db.lesson.findFirst({
                    where: {
                        start: lesson.from.start,
                        end: lesson.from.end,
                        Group: {
                            id: lesson.from.groupId
                        },
                        subgroup: lesson.from.subgroup || null
                    },
                });

                if (!found) {
                    throw new Error('Не найдено пары для обновления')
                }

                const item = await db.lesson.update({
                    where: {
                        id: found.id
                    },
                    data: {
                        title: lesson.to.title,
                        start: lesson.to.start,
                        end: lesson.to.end,
                        index: lesson.to.index,
                        subgroup: lesson.to.subgroup,
                        startDay: DateTime.fromJSDate(lesson.to.start).startOf('day').toJSDate(),
                        Group: {
                            connectOrCreate: {
                                where: {
                                    id: translit(lesson.to.group),
                                    title: lesson.to.group
                                },
                                create: {
                                    id: translit(lesson.to.group),
                                    title: lesson.to.group
                                }
                            }
                        },
                        Teacher: {
                            connectOrCreate: {
                                where: {
                                    id: translit(lesson.to.teacher || 'Не указан'),
                                    name: lesson.to.teacher || 'Не указан'
                                },
                                create: {
                                    id: translit(lesson.to.teacher || 'Не указан'),
                                    name: lesson.to.teacher || 'Не указан'
                                }
                            }
                        },
                        Classroom: {
                            connectOrCreate: {
                                where: {
                                    name: lesson.to.classroom
                                },
                                create: {
                                    name: lesson.to.classroom
                                }
                            }
                        },
                    },
                    include: {
                        Group: true,
                        Teacher: true,
                        Classroom: true
                    }
                })

                result.push({
                    type: "update",
                    status: "success",
                    inputItem: lesson.from,
                    item: item
                })
            } catch (e) {
                result.push({
                    type: "update",
                    status: "error",
                    inputItem: lesson.from,
                    item: lesson.to,
                    error: e.message
                })
            }
        } else if (lesson.from && !lesson.to) {
            try {
                await db.lesson.delete({
                    where: {
                        id: lesson.from.id
                    }
                })
                result.push({
                    type: "delete",
                    status: "success",
                    item: lesson.from
                })
            } catch (e) {
                result.push({
                    type: "delete",
                    status: "error",
                    item: lesson.from,
                    error: e.message
                })
            }
        }

        // async function _updateSchedule(lesson: LessonParsed) {
        //     let foundGroup = groups.find(group => group.title === lesson.group)
        //     if (!foundGroup) {
        //         foundGroup = await db.group.create({
        //             data: {
        //                 id: translit(lesson.group),
        //                 title: lesson.group
        //             },
        //             select: {
        //                 id: true,
        //                 title: true
        //             }
        //         })

        //         groups.push(foundGroup)
        //     }

        //     const foundLesson = await db.lesson.findFirst({
        //         where: {
        //             start: lesson.start,
        //             end: lesson.end,
        //             Groups: {
        //                 some: {
        //                     id: foundGroup.id
        //                 }
        //             },
        //             subgroup: lesson.subgroup || null
        //         },
        //         include: {
        //             Groups: true,
        //             Teacher: true,
        //             Classroom: true
        //         }
        //     })

        //     if (foundLesson && lesson.title === null) {
        //         if (foundLesson.Groups.filter(group => group.id !== foundGroup.id).length === 0) {
        //             await db.lesson.deleteMany({
        //                 where: {
        //                     start: lesson.start,
        //                     end: lesson.end,
        //                     Groups: {
        //                         some: {
        //                             title: lesson.group
        //                         }
        //                     },
        //                     subgroup: lesson.subgroup
        //                 }
        //             })
        //         } else {
        //             await db.lesson.update({
        //                 where: {
        //                     id: foundLesson.id
        //                 },
        //                 data: {
        //                     Groups: {
        //                         disconnect: {
        //                             id: foundGroup.id
        //                         }
        //                     }
        //                 },
        //                 include: {
        //                     Groups: true
        //                 }
        //             })
        //         }
        //         return
        //     }

        //     if (lesson.title === null) return

        //     let foundTeacher = teachers.find(teacher => teacher.name === lesson.teacher)
        //     if (!foundTeacher) {
        //         foundTeacher = await db.teacher.create({
        //             data: {
        //                 id: translit(lesson.teacher),
        //                 name: lesson.teacher
        //             },
        //             select: {
        //                 id: true,
        //                 name: true
        //             }
        //         })

        //         teachers.push(foundTeacher)
        //     }

        //     let foundClassroom = classrooms.find(classroom => classroom.name === lesson.classroom)
        //     if (!foundClassroom) {
        //         foundClassroom = await db.classroom.create({
        //             data: {
        //                 name: lesson.classroom
        //             },
        //             select: {
        //                 id: true,
        //                 name: true
        //             }
        //         })

        //         classrooms.push(foundClassroom)
        //     }


        //     if (foundLesson &&
        //         foundLesson.Teacher?.id === foundTeacher.id &&
        //         foundLesson.Classroom?.id === foundClassroom.id &&
        //         foundLesson.Groups.some(group => group.id === foundGroup.id) &&
        //         lesson.title === foundLesson.title &&
        //         lesson.index === foundLesson.index && foundLesson.subgroup === lesson.subgroup
        //     ) return

        //     if (foundLesson) {
        //         await db.lesson.update({
        //             where: {
        //                 id: foundLesson.id
        //             },
        //             data: {
        //                 title: lesson.title,
        //                 index: lesson.index,
        //                 subgroup: lesson.subgroup,
        //                 Classroom: {
        //                     connect: {
        //                         id: foundClassroom.id
        //                     }
        //                 },
        //                 Teacher: {
        //                     connect: {
        //                         id: foundTeacher.id
        //                     }
        //                 },
        //                 Days: {
        //                     connectOrCreate: [
        //                         {
        //                             where: {
        //                                 start_groupId: {
        //                                     start: DateTime.fromJSDate(lesson.start).startOf('day').toJSDate(),
        //                                     groupId: foundGroup.id
        //                                 }
        //                             },
        //                             create: {
        //                                 start: DateTime.fromJSDate(lesson.start).startOf('day').toJSDate(),
        //                                 Group: {
        //                                     connect: {
        //                                         id: foundGroup.id
        //                                     }
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             where: {
        //                                 start_teacherId: {
        //                                     start: DateTime.fromJSDate(lesson.start).startOf('day').toJSDate(),
        //                                     teacherId: foundTeacher.id
        //                                 }
        //                             },
        //                             create: {
        //                                 start: DateTime.fromJSDate(lesson.start).startOf('day').toJSDate(),
        //                                 Teacher: {
        //                                     connect: {
        //                                         id: foundTeacher.id
        //                                     }
        //                                 }
        //                             }
        //                         }
        //                     ]
        //                 }
        //             }
        //         })
        //     } else {
        //         await db.lesson.create({
        //             data: {
        //                 title: lesson.title,
        //                 start: lesson.start,
        //                 end: lesson.end,
        //                 index: lesson.index,
        //                 subgroup: lesson.subgroup,
        //                 Groups: {
        //                     connect: {
        //                         id: foundGroup.id
        //                     }
        //                 },
        //                 Teacher: {
        //                     connect: {
        //                         id: foundTeacher.id
        //                     }
        //                 },
        //                 Classroom: {
        //                     connect: {
        //                         id: foundClassroom.id
        //                     }
        //                 },
        //                 Days: {
        //                     connectOrCreate: [
        //                         {
        //                             where: {
        //                                 start_groupId: {
        //                                     start: DateTime.fromJSDate(lesson.start).startOf('day').toJSDate(),
        //                                     groupId: foundGroup.id
        //                                 }
        //                             },
        //                             create: {
        //                                 start: DateTime.fromJSDate(lesson.start).startOf('day').toJSDate(),
        //                                 Group: {
        //                                     connect: {
        //                                         id: foundGroup.id
        //                                     }
        //                                 }
        //                             }
        //                         },
        //                         {
        //                             where: {
        //                                 start_teacherId: {
        //                                     start: DateTime.fromJSDate(lesson.start).startOf('day').toJSDate(),
        //                                     teacherId: foundTeacher.id
        //                                 }
        //                             },
        //                             create: {
        //                                 start: DateTime.fromJSDate(lesson.start).startOf('day').toJSDate(),
        //                                 Teacher: {
        //                                     connect: {
        //                                         id: foundTeacher.id
        //                                     }
        //                                 }
        //                             }
        //                         }
        //                     ]
        //                 }
        //             }
        //         })
        //     }
        // }

        // await pMap(schedule, _updateSchedule, { concurrency: 1 })
    }

    const groupsToNotify = new Set<string>()
    const teachersToNotify = new Set<string>()
    
    for (let report of result) {
        groupsToNotify.add(report.item.Group?.title || report.item.group)
        groupsToNotify.add(report.inputItem?.Group?.title || report.inputItem?.group)
        teachersToNotify.add(report.item.Teacher?.name || report.item.teacher)
        teachersToNotify.add(report.inputItem?.Teacher?.name || report.inputItem?.teacher)
    }

    await notify(Array.from(teachersToNotify), Array.from(groupsToNotify))

    return result
}