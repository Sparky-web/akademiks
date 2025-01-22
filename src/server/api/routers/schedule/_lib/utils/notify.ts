import { db } from "~/server/db";
import sendNotification from "../../../push/send-notification";
import { ResultItem } from "./update-schedule";

export interface NotificationResultItem {
    type: 'teacher' | 'group',
    email: string,
    status: 'success' | 'error',
    group? : string,
    teacher?: string,
    error?: string
}

export default async function notify(teachers: string[], groups: string[]) {
    const reportReuslt: NotificationResultItem[] = []

    const users = await db.user.findMany({
        where: {
            AND: [
                {
                    OR: [
                        {
                            Teacher: {
                                name: {
                                    in: teachers
                                }
                            }
                        },
                        {
                            Group: {
                                title: {
                                    in: groups
                                }
                            }
                        }
                    ]
                },
                {
                    PushSubscription: {
                        some: {} // Ensures at least one PushSubscription exists
                    }
                }
            ]
        },
        include: {
            PushSubscription: true,
            Group: true,
            Teacher: true
        }
    });

    for (let user of users) {
        try {
            const title = 'Изменения в расписании'
            const body = user.role === 1 ? `Расписание группы ${user.Group?.title} изменено` : `Расписание ${user.Teacher?.name} изменено`
            await sendNotification(user.id, title, body)

            reportReuslt.push({
                type: user.role === 1 ? 'group' : 'teacher',
                email: user.email,
                group: user.Group?.title,
                status: 'success',
            })
        } catch (e) {
            console.error('Ошибка отправки уведомления пользователю: ' + user.email + ' - ' + e.message)
            reportReuslt.push({
                type: user.role === 1 ? 'group' : 'teacher',
                email: user.email,
                teacher: user.Teacher?.name,
                status: 'error',
                error: e?.message
            })
        }
    }

    return reportReuslt
}