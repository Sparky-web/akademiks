"use client";
import {
  CalendarDays,
  Home,
  User,
  Upload,
  Users,
  File,
  AlertCircleIcon,
  BookOpen,
  House,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FC, ReactElement, ReactNode } from "react";
import { cn } from "~/lib/utils";
import MobileMenu from "./mobile";
import DesktopMenu from "./desktop";
import { useAppSelector } from "../../../app/_lib/client-store";

const menu: MenuItem[] = [
  {
    title: "Главная",
    path: "/lk/my-schedule",
    icon: Home,
  },
  {
    title: "Все расписания",
    path: "/lk/all-schedules",
    icon: CalendarDays,
  },
  {
    title: "Профиль",
    path: "/lk/profile",
    icon: User,
  },
  // {
  //     title: 'Загрузить расписание',
  //     path: '/lk/add-schedule',
  //     icon: Upload
  // }
];

export interface MenuItem {
  title: string;
  path: string;
  icon: FC<any>;
}

export default function Menu() {
  const pathname = usePathname();

  const user = useAppSelector((e) => e.user?.user);

  const desktopMenu = [...menu];
  if (user && user.isAdmin) {
    desktopMenu.push({
      title: "Управление расписанием",
      path: "/lk/add-schedule",
      icon: Upload,
    });

    desktopMenu.push({
      title: "Пользователи",
      path: "/lk/users",
      icon: Users,
    });

    desktopMenu.push({
      title: "Отчеты",
      path: "/lk/reports",
      icon: File,
    });

    desktopMenu.push({
      title: "Отчеты об ошибках",
      path: "/lk/error-reports",
      icon: AlertCircleIcon,
    });

    desktopMenu.push({
      title: "Группы",
      path: "/lk/groups",
      icon: Users,
    });

    desktopMenu.push({
      title: "Преподаватели",
      path: "/lk/teachers",
      icon: User,
    });

    desktopMenu.push({
      title: "Аудитории",
      path: "/lk/classrooms",
      icon: House,
    });

    desktopMenu.push({
      title: "Предметы",
      path: "/lk/subjects",
      icon: BookOpen,
    });
  }

  return (
    <>
      <MobileMenu data={menu} />
      <DesktopMenu data={desktopMenu} />
    </>
  );
}
