import { Lesson } from "~/types/schedule"

export const sanitizeLesson = (lesson: Lesson) => {
    return {
        title: lesson.title,
        start: lesson.start,
        end: lesson.end,
        index: lesson.index,
        subgroup: lesson.subgroup,
        teacherId: lesson.teacherId,
        isDeleted: lesson.isDeleted,
        groupId: lesson.groupId,
        classroomId: lesson.classroomId,
        subgroup: lesson.subgroup,
    }
}