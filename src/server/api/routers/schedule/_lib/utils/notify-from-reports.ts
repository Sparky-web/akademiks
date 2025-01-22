import notify from "./notify";
import { ResultItem } from "./update-schedule";

export default async function notifyFromReports(reports: ResultItem[], shouldDisplayForStudents: boolean, shouldDisplayForTeachers?: boolean) {
    const groupsToNotify = new Set<string>()
    const teachersToNotify = new Set<string>()

    if (typeof shouldDisplayForTeachers === 'undefined') shouldDisplayForTeachers = true

    for (let report of reports) {
        if (shouldDisplayForTeachers) {
            teachersToNotify.add(report.item.Teacher?.name || report.item.teacher)
            teachersToNotify.add(report.inputItem?.Teacher?.name || report.inputItem?.teacher)
        }

        if (shouldDisplayForStudents) {
            groupsToNotify.add(report.item.Group?.title || report.item.group)
            groupsToNotify.add(report.inputItem?.Group?.title || report.inputItem?.group)
        }
    }

    const result = await notify(Array.from(teachersToNotify).filter(e => e), Array.from(groupsToNotify).filter(e => e))
    return result
}