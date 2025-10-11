"use client";

import Card, { CardTitle } from "~/components/custom/card";
import { H1, H2, H3, P } from "~/components/ui/typography";
import UrtkLogo from "~/app/_lib/images/urtk-logo.png";
import RgsuLogo from "~/app/_lib/images/rgsu-logo.png";
import Image from "next/image";
import { env } from "~/env";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useAppDispatch } from "../../../app/_lib/client-store";
import { setUser } from "../../../app/_lib/client-store/_lib/slices/user";

export default function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const logo = useMemo(
    () => (env.NEXT_PUBLIC_UNIVERSITY === "RGSU" ? RgsuLogo : UrtkLogo),
    [env.NEXT_PUBLIC_UNIVERSITY],
  );

  const utils = api.useUtils();

  const dispatch = useAppDispatch();

  const navigation = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      e.preventDefault();
      const res = await signIn("credentials", {
        email: email,
        password,
        redirect: false,
      });

      if (res?.error) {
        console.error(res.error);
        throw new Error(res.error);
      }

      const session = await getSession();

      if (session?.user) {
        dispatch(setUser(session.user));
      }

      navigation.push("/lk/my-schedule");
    } catch (e) {
      toast.error("Неверный email или пароль");
    }
  };

  return (
    <Card className="w-[500px] max-w-full p-6">
      <form className="grid gap-9" onSubmit={handleSubmit}>
        <div className="flex flex-wrap justify-between gap-4">
          <H2>Академикс</H2>
          <Image
            src={logo}
            alt="logo"
            width={136}
            height={26}
            objectFit="contain"
          />
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2 md:text-center">
            <H1 className="text-[24px] max-md:text-[20px]">
              Вход на платформу
            </H1>
            <P className="leading-6 max-md:text-[14px] max-md:leading-5">
              Сохранение вашего расписания, избранные расписания и больше
            </P>
          </div>
          <div className="grid gap-3">
            <div className="5 grid gap-1">
              <Label>Email</Label>
              <Input
                placeholder="Ваш email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label>Пароль</Label>
              <Input
                placeholder="Ваш пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={"password"}
              />
            </div>
            <div className="mt-3 flex justify-center">
              <Button
                className="w-full"
                size={"lg"}
                disabled={!email || !password}
                type="submit"
              >
                Войти
              </Button>
            </div>
          </div>
          <P className="mt-3 text-sm leading-6 md:text-center">
            Если у Вас нет учетной записи -{" "}
            <Link href={"/auth/signup"} className="text-primary">
              нажмите здесь, чтобы зарегистрироваться
            </Link>
          </P>
          <P className="text-sm leading-6 md:text-center">
            Для сброса пароля обратитесь в учебную часть
          </P>
        </div>
      </form>
    </Card>
  );
}
