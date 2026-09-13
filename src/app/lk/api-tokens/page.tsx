"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useAppSelector } from "~/app/_lib/client-store";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import PageTitle from "~/components/custom/page-title";

export default function ApiTokensPage() {
  const isAdmin = useAppSelector((state) => state.user.user?.isAdmin);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const utils = api.useUtils();
  const list = api.apiTokens.list.useQuery(undefined, {
    enabled: !!isAdmin,
    refetchInterval: 15000,
  });
  const create = api.apiTokens.create.useMutation({
    onSuccess: ({ token }) => {
      setSecret(token);
      setName("");
      void utils.apiTokens.list.invalidate();
    },
  });
  const revoke = api.apiTokens.revoke.useMutation({
    onSuccess: () => {
      void utils.apiTokens.list.invalidate();
    },
  });
  if (!isAdmin) return <p>Доступ разрешён только администраторам.</p>;
  return (
    <div className="grid gap-6">
      <PageTitle>API-токены</PageTitle>
      <p>
        Токен даёт доступ к спискам групп, преподавателей и опубликованному
        расписанию. Статистика обновляется каждые 15 секунд.
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ name });
        }}
      >
        <label className="grid gap-2">
          Название токена
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
            placeholder="Например, мобильное приложение"
          />
        </label>
        <Button
          type="submit"
          disabled={create.isPending || !name.trim() || !!secret}
        >
          Выпустить токен
        </Button>
      </form>
      {secret && (
        <div className="grid gap-3 rounded-lg border p-4" role="status">
          <p>Сохраните токен. После закрытия он больше не будет показан.</p>
          <code className="select-all break-all">{secret}</code>
          <Button onClick={() => setSecret("")}>Токен сохранён — скрыть</Button>
        </div>
      )}
      {(create.error || revoke.error || list.error) && (
        <p role="alert">
          {create.error?.message ??
            revoke.error?.message ??
            list.error?.message}
        </p>
      )}
      {list.isLoading && <p>Загрузка токенов…</p>}
      {list.data?.length === 0 && <p>Токены ещё не выпущены.</p>}
      <div className="grid gap-3">
        {list.data?.map((token) => (
          <article key={token.id} className="grid gap-2 rounded-lg border p-4">
            <h2 className="break-words font-semibold">{token.name}</h2>
            <code>{token.prefix}…</code>
            <p>Запросов: {token.requestCount}</p>
            <p>Создан: {token.createdAt.toLocaleString("ru-RU")}</p>
            <p>
              Последний запрос:{" "}
              {token.lastUsedAt?.toLocaleString("ru-RU") ?? "Нет"}
            </p>
            {token.revokedAt ? (
              <p>Отозван: {token.revokedAt.toLocaleString("ru-RU")}</p>
            ) : (
              <Button
                variant="destructive"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate({ id: token.id })}
              >
                Отозвать токен
              </Button>
            )}
          </article>
        ))}
      </div>
      <div className="grid gap-2">
        <h2 className="font-semibold">REST API v1</h2>
        <p>Передавайте заголовок Authorization: Bearer ВАШ_ТОКЕН.</p>
        <code className="break-all">
          GET /api/v1/groups?limit=100&amp;offset=0
        </code>
        <code className="break-all">
          GET /api/v1/teachers?limit=100&amp;offset=0
        </code>
        <code className="break-all">
          GET /api/v1/groups/ID/schedule?weekStart=2026-09-14
        </code>
        <code className="break-all">
          GET /api/v1/teachers/ID/schedule?weekStart=2026-09-14
        </code>
        <p>
          Без weekStart возвращается текущая неделя. Счётчик учитывает
          GET-запросы с действующим токеном, включая ответы с ошибками.
        </p>
      </div>
    </div>
  );
}
