"use client";
import { useForm } from "@tanstack/react-form";
import { getSession, signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAppDispatch } from "~/app/_lib/client-store";
import { setUser } from "~/app/_lib/client-store/_lib/slices/user";
import Card, { CardTitle } from "~/components/custom/card";
import { Label, LabelGroup } from "~/components/custom/label-group";
import LoaderFullscreen from "~/components/custom/loader/fullscreen";
import PageTitle from "~/components/custom/page-title";
import TextFormField from "~/components/custom/text-form-field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { z } from "~/lib/utils/zod-russian";
import { api } from "~/trpc/react";

export default function ResetPassword({
  onLogin,
}: {
  onLogin: (type: "student" | "teacher") => void;
}) {
  const params = useSearchParams();
  const token = params.get("token");

  const dispatch = useAppDispatch();

  const { data, isError, isPending } = api.auth.getResetPasswordData.useQuery(
    {
      token: token || "",
    },
    {
      retry: false,
    },
  );

  const navigation = useRouter();

  const { mutate: resetPassword, isPending: isPendingAuth } =
    api.auth.resetPassword.useMutation({
      onError: (e) => {
        toast.error("Что-то пошло не так: " + e.message);
      },
      onSuccess: async () => {
        toast.success("Пароль успешно сброшен");

        if (!data) return;

        const res = await signIn("credentials", {
          email: data.email,
          password: form.getFieldValue("password"),
          redirect: false,
        });

        if (res?.error) {
          console.error(res.error);
          toast.error("Что-то пошло не так: " + res.error);
          return;
        }

        const session = await getSession();

        if (session?.user) {
          dispatch(setUser(session.user));
        }

        navigation.push("/lk/my-schedule");
      },
    });

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      if (value.password !== value.confirmPassword) {
        toast.error("Пароли не совпадают");
        return;
      }

      resetPassword({
        token: token || "",
        password: value.password,
      });
    },
  });

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {(!token || isError) && <PageTitle>Ссылка недейтствительна</PageTitle>}
      {isPending && <LoaderFullscreen />}
      {data && (
        <Card>
          <CardTitle>Восстановление пароля</CardTitle>
          <LabelGroup>
            <Label>вы востанавливаете пароль для аккаунта с email</Label>
            {data.email}
          </LabelGroup>

          <form.Field
            name="password"
            validators={{
              onChange: z.string().min(8),
            }}
          >
            {(field) => (
              <TextFormField
                field={field}
                label="Новый пароль"
                inputProps={{
                  placeholder: "Введите новый пароль",
                  type: "password",
                }}
              />
            )}
          </form.Field>
          <form.Field
            name="confirmPassword"
            validators={{
              onChange: z.string().min(8),
            }}
          >
            {(field) => (
              <TextFormField
                field={field}
                label="Повторите пароль"
                inputProps={{
                  placeholder: "Введите новый пароль еще раз",
                  type: "password",
                }}
              />
            )}
          </form.Field>

          <form.Subscribe selector={(form) => [form.canSubmit]}>
            {([canSubmit]) => (
              <Button
                disabled={!canSubmit || isPendingAuth}
                size={"lg"}
                type="submit"
                onClick={() => {
                  form.handleSubmit();
                }}
              >
                Сохранить и войти
              </Button>
            )}
          </form.Subscribe>
        </Card>
      )}
    </div>
  );
}
