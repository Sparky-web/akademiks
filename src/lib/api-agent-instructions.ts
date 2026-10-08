import { API_SCOPE_LABELS, API_SCOPES, type ApiScope } from "./api-scopes";

// Инструкция для ИИ-агента: копируется со страницы API-токенов.
// Без токена в тексте остаётся плейсхолдер, который агент берёт из окружения.
export function buildAgentInstructions({
  origin,
  token,
  scopes,
}: {
  origin: string;
  token?: string;
  scopes?: readonly ApiScope[];
}) {
  const base = `${origin}/api/v1`;
  const scopeLines = scopes
    ? scopes.length
      ? scopes.map((scope) => `- \`${scope}\` — ${API_SCOPE_LABELS[scope]}`)
      : ["- только чтение"]
    : [
        "Узнай права токена через `GET /me`. Возможные права на запись:",
        ...API_SCOPES.map(
          (scope) => `- \`${scope}\` — ${API_SCOPE_LABELS[scope]}`,
        ),
      ];
  return `# API расписания Академикс — инструкция для агента

Ты работаешь с расписанием учебного заведения через REST API.
Базовый URL: ${base}
Авторизация: заголовок \`Authorization: Bearer ${token ?? "$AKADEMIKS_TOKEN"}\`.
${token ? "Не показывай токен пользователю и не сохраняй его в файлы репозитория." : "Токен возьми из переменной окружения AKADEMIKS_TOKEN или спроси у пользователя."}
Тело запросов и ответов — JSON (\`Content-Type: application/json\`).

## Права токена
${scopeLines.join("\n")}
Чтение доступно любому токену. Без нужного права запись вернёт 403.
Начни с \`GET /me\`: ответ содержит название токена, права и часовой пояс.

## Время
Даты в ответах — ISO 8601 в UTC. Время в запросах передавай ISO 8601 с явным смещением,
например \`2026-10-12T08:30:00+05:00\`. Параметры \`from\`, \`to\`, \`weekStart\` — даты \`YYYY-MM-DD\`
в часовом поясе учебного заведения (\`timezone\` из \`GET /me\`).

## Чтение
- \`GET /me\` — токен, права, часовой пояс.
- \`GET /groups?limit=500&offset=0\` — группы \`{ id, title }\`.
- \`GET /teachers?limit=500&offset=0\` — преподаватели \`{ id, name }\`.
- \`GET /classrooms\` — все кабинеты \`{ id, name, address, isHidden }\`. Дистанционный кабинет называется «Дистант».
- \`GET /lessons?from=YYYY-MM-DD&to=YYYY-MM-DD\` — пары за период (\`to\` включительно, до 31 дня).
  Фильтры: \`groupId\`, \`teacherId\`, \`classroomId\`, \`index\` (номер пары). \`includeHidden=true\` добавляет
  скрытые от студентов пары (только с правом \`schedule:write\`). Пагинация: \`limit\` до 1000 (по умолчанию 500), \`offset\`.
  Если \`pagination.total\` больше полученного — запроси следующие страницы.
- \`GET /lessons/{id}\` — одна пара.
- \`GET /groups/{id}/schedule?weekStart=YYYY-MM-DD\`, \`GET /teachers/{id}/schedule?weekStart=...\` — опубликованное расписание на неделю.

Пара: \`{ id, title, start, end, index, subgroup, type, meetingUrl, shouldDisplayForStudents, teacher, group, classroom }\`.
\`teacher\`, \`group\`, \`classroom\` — объекты или null.

## Изменение пар (право schedule:write)
Главная ручка — \`POST /lessons/batch\`:
\`\`\`json
{
  "dryRun": true,
  "notify": false,
  "operations": [
    { "op": "update", "id": 123, "data": { "classroomId": 45 } },
    { "op": "create", "data": { "title": "Математика", "groupId": "ID_ГРУППЫ", "start": "2026-10-12T08:30:00+05:00", "end": "2026-10-12T10:00:00+05:00", "index": 1 } },
    { "op": "delete", "id": 124 }
  ]
}
\`\`\`
- До 500 операций за запрос. Пакет атомарный: при любой ошибке ничего не меняется,
  ответ 422 содержит \`error.details\` со списком \`{ index, message }\` по номерам операций.
- \`dryRun: true\` ничего не записывает и возвращает, как изменится каждая пара (\`before\`/\`after\`).
- \`notify: true\` отправляет push-уведомления затронутым группам и преподавателям. По умолчанию уведомлений нет.
- Поля \`data\`: \`title\`, \`start\`, \`end\`, \`index\` (0–20), \`subgroup\` (1–10 или null), \`type\` (строка или null),
  \`teacherId\` (или null), \`groupId\`, \`classroomId\` (или null), \`shouldDisplayForStudents\` (видимость для студентов).
  Для \`create\` обязательны \`title\`, \`groupId\`, \`start\`, \`end\`, \`index\`; новая пара видима по умолчанию.
  Для \`update\` передавай только изменяемые поля. Неизвестные поля отклоняются.
- Ответ: \`{ dryRun, applied, summary: { created, updated, deleted, unchanged }, results: [{ index, op, id, changed, before, after }] }\`.
  Операции, которые ничего не меняют, пропускаются (\`changed: false\`) — повторный запрос безопасен.
- Ссылка на видеовстречу (\`meetingUrl\`) сбрасывается при смене преподавателя или переносе пары из «Дистанта».
- Одиночные ручки с теми же правилами: \`POST /lessons\` (тело — поля пары), \`PATCH /lessons/{id}\` (изменяемые поля),
  \`DELETE /lessons/{id}\`. Параметры \`?dryRun=true\` и \`?notify=true\` передаются в URL.

## Преподаватели и группы
- \`POST /teachers\` \`{ "name": "Иванов И.И." }\` (право \`teachers:write\`), \`POST /groups\` \`{ "title": "ИС-21" }\` (право \`groups:write\`).
  Можно передать свой \`id\` (латиница, цифры, \`-_.\`), иначе он строится транслитерацией. Дубликат ID — 409.
- \`PATCH /teachers/{id}\` \`{ "name": "..." }\`, \`PATCH /groups/{id}\` \`{ "title": "..." }\` — переименование.
- \`DELETE /teachers/{id}\`, \`DELETE /groups/{id}\` — если есть пары или пользователи, ответ 409 \`HAS_DEPENDENCIES\` с количеством.
  \`?force=true\` удаляет всё равно: у пар преподавателя преподаватель снимается, пары группы удаляются вместе с группой.

## Порядок работы при массовых изменениях
1. \`GET /me\` — проверь права.
2. Найди нужные ID: \`GET /classrooms\`, \`GET /groups\`, \`GET /teachers\`.
3. Выгрузи пары: \`GET /lessons?from=...&to=...&includeHidden=true\` (+ фильтры). Пройди все страницы.
4. Собери операции и отправь \`POST /lessons/batch\` с \`"dryRun": true\`.
5. Покажи пользователю сводку (\`summary\` и несколько примеров \`before\` → \`after\`) и получи подтверждение.
6. Повтори тот же запрос с \`"dryRun": false\`. Больше 500 операций — разбей на несколько пакетов.
7. Сообщи пользователю итог из \`summary\`.

Пример: перевести все пары 12.10.2026 в «Дистант».
\`\`\`sh
curl -s "${base}/classrooms" -H "Authorization: Bearer $AKADEMIKS_TOKEN"   # найди id кабинета «Дистант»
curl -s "${base}/lessons?from=2026-10-12&to=2026-10-12&includeHidden=true&limit=1000" -H "Authorization: Bearer $AKADEMIKS_TOKEN"
curl -s -X POST "${base}/lessons/batch" -H "Authorization: Bearer $AKADEMIKS_TOKEN" -H "Content-Type: application/json" \\
  -d '{"dryRun":true,"operations":[{"op":"update","id":123,"data":{"classroomId":45}}]}'
\`\`\`

## Правила безопасности
- Удаляй пары, группы и преподавателей только по явной просьбе пользователя. \`force=true\` — только после подтверждения.
- Перед любой записью делай \`dryRun\` и показывай пользователю, что изменится.
- Включай \`notify\` только если пользователь попросил уведомить студентов и преподавателей.
- Не меняй поля, о которых не просили.

## Ошибки
Формат: \`{ "error": { "code": "...", "message": "...", "details": ... } }\`.
400 — неверные параметры или тело; 401 — токен отсутствует или отозван; 403 — у токена нет права;
404 — маршрут или объект не найден; 405 — метод не поддерживается; 409 — конфликт (дубликат, зависимости,
данные изменились во время запроса — перечитай и повтори); 413 — тело больше 1 МБ; 422 — операции не прошли проверку; 500 — внутренняя ошибка.
`;
}
