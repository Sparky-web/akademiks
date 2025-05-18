"use client";

import { Star } from "lucide-react";
import { useAppDispatch, useAppSelector } from "~/app/_lib/client-store";
import {
  addFavourite,
  removeFavourite as removeFavouriteReducer,
} from "~/app/_lib/client-store/_lib/slices/user";
import { ScheduleProps } from "~/components/custom/schedule";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export default function AddToFavourite(props: ScheduleProps) {
  const { mutateAsync } = api.user.addFavourite.useMutation();

  const { mutateAsync: removeFavourite } =
    api.user.removeFavourite.useMutation();

  const user = useAppSelector((e) => e.user?.user);
  const dispatch = useAppDispatch();

  if (!user) return null;

  const favouriteFound = user.Favourites?.find(
    (e) =>
      e.type === props.type &&
      (e.groupId === props.groupId ||
        e.teacherId === props.teacherId ||
        e.classroomId === props.classroomId),
  );

  const add = async () => {
    const data = await mutateAsync({
      type: props.type,
      groupId: props.groupId,
      teacherId: props.teacherId,
      classroomId: props.classroomId,
    });

    dispatch(addFavourite(data));
  };

  const remove = async () => {
    if (!favouriteFound) return;

    await removeFavourite({ id: favouriteFound.id });
    dispatch(removeFavouriteReducer({ id: favouriteFound.id }));
  };

  return (
    <>
      <Button
        size="sm"
        onClick={favouriteFound ? remove : add}
        className={cn("bg-amber-600/10 text-amber-600 hover:bg-amber-600/20")}
      >
        <Star
          className="h-4 w-4"
          fill={favouriteFound ? "currentColor" : "transparent"}
        />
        {favouriteFound ? "в избранном" : "в избранное"}
      </Button>
    </>
  );
}
