export const LESSON_COMMENT_MAX_LENGTH = 500;

/**
 * Приводит комментарий преподавателя к паре к сохраняемому виду.
 * Пустая строка означает «убрать комментарий» и возвращает null.
 */
export function normalizeLessonComment(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.length > LESSON_COMMENT_MAX_LENGTH)
    throw new Error(
      `Комментарий длиннее ${LESSON_COMMENT_MAX_LENGTH} символов`,
    );

  return trimmed;
}
