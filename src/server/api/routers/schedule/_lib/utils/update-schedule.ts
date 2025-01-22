import DateTime from "~/lib/utils/datetime"

import { LessonParsed } from "~/lib/utils/schedule/flatten-schedule";
import { P } from "~/components/ui/typography";
import translit from "~/lib/utils/translit";
import { db } from "~/server/db";
import pMap from 'p-map';
import getScheduleDifference from "./get-schedule-difference";
import { Lesson } from "~/types/schedule";
import notify, { NotificationResultItem } from "./notify";
import notifyFromReports from "./notify-from-reports";
import generateReport from "./generate-report";

export interface ResultItem {
    type: "add" | "update" | "delete",
    status: "success" | "error",
    item?: Lesson | LessonParsed,
    inputItem?: Lesson | LessonParsed,
    error?: string
}

export interface UpdateReport {
    error?: string | null,
    notificationError?: string | null,
    summary: {
        added: number,
        updated: number,
        deleted: number,
        errors: number,
        notificationsSent: number,
        notificationsError: number,
        groupsAffected: {
            title: string,
            count: number,
            notificationsSent: number
            notificationsError: number
        }[],
        teachersAffected: {
            title: string,
            count: number,
            notificationsSent: number
            notificationsError: number
        }[]
    },
    result: ResultItem[]
    notificationResult: NotificationResultItem[]
}

export default async function updateSchedule(schedule: LessonParsed[], shouldDisplayForStudents: boolean) {
    const result: ResultItem[] = []
    let notificationResult: NotificationResultItem[] = []

    let report: UpdateReport = {
        error: null,
        notificationError: null,
        summary: {
            added: 0,
            updated: 0,
            deleted: 0,
            groupsAffected: [],
            teachersAffected: [],
            notificationsSent: 0,
            notificationsError: 0
        },
        result: [],
        notificationResult: []
    }

    try {
        const difference = await getScheduleDifference(schedule)
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
                            shouldDisplayForStudents
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
                            shouldDisplayForStudents
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
        }
    } catch (e) {
        console.error('Ошибка обновления расписания: ' + e.message)
        report.error = e.message
    }

    try {
        notificationResult = await notifyFromReports(result, shouldDisplayForStudents)
    } catch (e) {
        console.error('Ошибка отправки уведомлений: ' + e.message)
        report.notificationError = e.message
    }

    report = generateReport(report, result, notificationResult)

    return report
}


