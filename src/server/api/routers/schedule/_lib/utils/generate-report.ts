import { NotificationResultItem } from "./notify";
import { ResultItem, UpdateReport } from "./update-schedule";

export default function generateReport(report: UpdateReport, result: ResultItem[], notificationResult: NotificationResultItem[]): UpdateReport {
    report.summary.notificationsSent = notificationResult.filter(e => e.status === 'success').length
    report.summary.notificationsError = notificationResult.filter(e => e.status === 'error').length

    report.summary.added = result.filter(e => e.type === 'add').length
    report.summary.updated = result.filter(e => e.type === 'update').length
    report.summary.deleted = result.filter(e => e.type === 'delete').length

    report.summary.errors = result.filter(e => e.status === 'error').length

    const groupsAffected: UpdateReport['summary']['groupsAffected'] = []
    const teachersAffected: UpdateReport['summary']['teachersAffected'] = []

    for (let report of result) {
        if (report.item) {
            report.item.group = report.item.Group?.title || report.item.group
            report.item.teacher = report.item.Teacher?.name || report.item.teacher
        }
        if (report.inputItem) {
            report.inputItem.group = report.inputItem.Group?.title || report.inputItem.group
            report.inputItem.teacher = report.inputItem.Teacher?.name || report.inputItem.teacher
        }
    }

    const uniqueGroups = [...new Set(result.map(e => e.item?.group || e.inputItem?.group))]
    const uniqueTeachers = [...new Set(result.map(e => e.item?.teacher || e.inputItem?.teacher))]

    for (let group of uniqueGroups) {
        groupsAffected.push({
            title: group,
            count: result.filter(e => (e.item?.group === group || e.inputItem?.group === group) && e.status === 'success').length,
            notificationsSent: notificationResult?.filter(e => e.group === group && e.status === 'success').length || 0,
            notificationsError: notificationResult?.filter(e => e.group === group && e.status === 'error').length || 0,
        })
    }

    for (let teacher of uniqueTeachers) {
        teachersAffected.push({
            title: teacher,
            count: result.filter(e => (e.item?.teacher === teacher || e.inputItem?.teacher === teacher) && e.status === 'success').length,
            notificationsSent: notificationResult?.filter(e => e.teacher === teacher && e.status === 'success').length || 0,
            notificationsError: notificationResult?.filter(e => e.teacher === teacher && e.status === 'error').length || 0,
        })
    }

    report.summary.groupsAffected = groupsAffected
    report.summary.teachersAffected = teachersAffected

    report.result = result
    report.notificationResult = notificationResult

    return report
}