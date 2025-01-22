import { Lesson } from "~/types/schedule"
import { sanitizeLesson } from "./sanitize-lesson"

export const isLessonsEqual = (a: Lesson, b: Lesson) => {
    return JSON.stringify(sanitizeLesson(a)) === JSON.stringify(sanitizeLesson(b))
}

