"use client";
import { Classroom, Group } from "@prisma/client";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "~/app/_lib/client-store";
import {
  setClassrooms,
  setGroups,
  setTeachers,
} from "~/app/_lib/client-store/_lib/slices/schedule";
import { Teacher } from "~/types/schedule";

interface SetScheduleProps {
  groups: Group[];
  teachers: Teacher[];
  classrooms?: Classroom[];
  children: React.ReactNode;
}

export default function SetSchedule(props: SetScheduleProps) {
  const { groups, teachers, classrooms } = props;

  const dispatch = useAppDispatch();
  const {
    groups: groupsState,
    teachers: teachersState,
    classrooms: classroomsState,
  } = useAppSelector((state) => state.schedule);

  useEffect(() => {
    if (groups && teachers) {
      dispatch(setGroups(groups));
      dispatch(setTeachers(teachers));
      dispatch(setClassrooms(classrooms || []));
    }
  }, [groups, teachers, classrooms]);

  return (
    <>{groupsState && teachersState && classroomsState && props.children}</>
  );
}
