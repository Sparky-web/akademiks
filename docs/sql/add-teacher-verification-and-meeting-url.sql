-- Подтверждение преподавателей администратором и ссылка на видеовстречу в паре.
-- Только добавляет nullable/default-колонки, существующие строки не меняются.
-- Все текущие пользователи получают isTeacherVerified = false.

ALTER TABLE "User"
  ADD COLUMN "isTeacherVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "teacherVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Lesson"
  ADD COLUMN "meetingUrl" TEXT;
