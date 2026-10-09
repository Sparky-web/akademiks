"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { useAppSelector } from "~/app/_lib/client-store";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import PageTitle from "~/components/custom/page-title";
import {
  API_SCOPE_LABELS,
  API_SCOPES,
  type ApiScope,
  isApiScope,
} from "~/lib/api-scopes";
import { buildAgentInstructions } from "~/lib/api-agent-instructions";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Инструкция скопирована");
  } catch {
    toast.error("Не удалось скопировать. Выделите текст вручную.");
  }
}

export default function ApiTokensPage() {
  const isAdmin = useAppSelector((state) => state.user.user?.isAdmin);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>([]);
  const [issued, setIssued] = useState<{
    token: string;
    scopes: ApiScope[];
  } | null>(null);
  const utils = api.useUtils();
  const list = api.apiTokens.list.useQuery(undefined, {
    enabled: !!isAdmin,
    refetchInterval: 15000,
  });
  const create = api.apiTokens.create.useMutation({
    onSuccess: ({ token }, input) => {
      setIssued({ token, scopes: input.scopes ?? [] });
      setName("");
      setScopes([]);
      void utils.apiTokens.list.invalidate();
    },
  });
  const revoke = api.apiTokens.revoke.useMutation({
    onSuccess: () => {
      void utils.apiTokens.list.invalidate();
    },
  });
  if (!isAdmin) return <p>Доступ разрешён только администраторам.</p>;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const instructions = buildAgentInstructions({ origin });
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle>API-токены</PageTitle>
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Инструкция для агента</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Инструкция для ИИ-агента</DialogTitle>
                <DialogDescription>
                  Передайте текст агенту вместе с токеном в переменной окружения
                  AKADEMIKS_TOKEN.
                </DialogDescription>
              </DialogHeader>
              <Button onClick={() => void copy(instructions)}>
                Скопировать инструкцию
              </Button>
              <pre className="whitespace-pre-wrap break-words rounded-lg border p-4 text-xs">
                {instructions}
              </pre>
            </DialogContent>
          </Dialog>
          <Button onClick={() => void copy(instructions)}>
            Скопировать инструкцию
          </Button>
        </div>
      </div>
      <p>
        Любой токен даёт доступ на чтение групп, преподавателей, кабинетов и
        расписания. Права на изменение выбираются при выпуске и потом не
        меняются. Статистика обновляется каждые 15 секунд.
      </p>
      <form
        className="grid gap-4 rounded-lg border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ name, scopes });
        }}
      >
        <label className="grid gap-2">
          Название токена
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
            placeholder="Например, агент диспетчера"
          />
        </label>
        <fieldset className="grid gap-2">
          <legend className="mb-2">Права на изменение</legend>
          {API_SCOPES.map((scope) => (
            <label key={scope} className="flex items-center gap-2">
              <Checkbox
                checked={scopes.includes(scope)}
                onCheckedChange={(checked) =>
                  setScopes((current) =>
                    checked
                      ? [...current, scope]
                      : current.filter((item) => item !== scope),
                  )
                }
              />
              {API_SCOPE_LABELS[scope]}
              <code className="text-xs text-muted-foreground">{scope}</code>
            </label>
          ))}
          <p className="text-sm text-muted-foreground">
            Без отмеченных прав токен только читает данные.
          </p>
        </fieldset>
        <Button
          type="submit"
          className="justify-self-start"
          disabled={create.isPending || !name.trim() || !!issued}
        >
          Выпустить токен
        </Button>
      </form>
      {issued && (
        <div className="grid gap-3 rounded-lg border p-4" role="status">
          <p>Сохраните токен. После закрытия он больше не будет показан.</p>
          <code className="select-all break-all">{issued.token}</code>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                void copy(
                  buildAgentInstructions({
                    origin,
                    token: issued.token,
                    scopes: issued.scopes,
                  }),
                )
              }
            >
              Скопировать инструкцию с токеном
            </Button>
            <Button onClick={() => setIssued(null)}>
              Токен сохранён — скрыть
            </Button>
          </div>
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
        {list.data?.map((token) => {
          const tokenScopes = token.scopes.filter(isApiScope);
          return (
            <article
              key={token.id}
              className="grid gap-2 rounded-lg border p-4"
            >
              <h2 className="break-words font-semibold">{token.name}</h2>
              <code>{token.prefix}…</code>
              <div className="flex flex-wrap gap-2">
                {tokenScopes.length ? (
                  tokenScopes.map((scope) => (
                    <Badge
                      key={scope}
                      size="sm"
                      title={API_SCOPE_LABELS[scope]}
                    >
                      {scope}
                    </Badge>
                  ))
                ) : (
                  <Badge size="sm" variant="secondary">
                    только чтение
                  </Badge>
                )}
              </div>
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
          );
        })}
      </div>
      <div className="grid gap-2">
        <h2 className="font-semibold">REST API v1</h2>
        <p>
          Передавайте заголовок Authorization: Bearer ВАШ_ТОКЕН. Полное описание
          ручек — в инструкции для агента.
        </p>
        <code className="break-all">GET /api/v1/me</code>
        <code className="break-all">
          GET /api/v1/groups · /teachers · /classrooms
        </code>
        <code className="break-all">
          GET /api/v1/lessons?from=2026-10-12&amp;to=2026-10-12
        </code>
        <code className="break-all">
          GET /api/v1/groups/ID/schedule?weekStart=2026-09-14
        </code>
        <code className="break-all">POST /api/v1/lessons/batch</code>
        <code className="break-all">
          POST · PATCH · DELETE /api/v1/lessons, /teachers, /groups
        </code>
      </div>
    </div>
  );
}
