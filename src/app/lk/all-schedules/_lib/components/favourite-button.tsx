import { User, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Favourite } from "~/types/schedule";

interface FavouriteButtonProps {
  favourite: Favourite;
}

export default function FavouriteButton({ favourite }: FavouriteButtonProps) {
  if (favourite.type === "student") {
    return (
      <Link href={`/lk/all-schedules/${favourite.type}/${favourite.groupId}`}>
        <Button variant={"tenary"} className="rounded-xl px-4 py-1">
          <Users className="h-4 w-4" />
          {favourite.Group?.title}
        </Button>
      </Link>
    );
  } else if (favourite.type === "classroom") {
    return (
      <Link
        href={`/lk/all-schedules/${favourite.type}/${favourite.classroomId}`}
      >
        <Button variant={"tenary"} className="rounded-xl px-4 py-1">
          <User className="h-4 w-4" />
          {favourite.Classroom?.name}
        </Button>
      </Link>
    );
  } else {
    return (
      <Link href={`/lk/all-schedules/${favourite.type}/${favourite.teacherId}`}>
        <Button variant={"tenary"} className="rounded-xl px-4 py-1">
          <User className="h-4 w-4" />
          {favourite.Teacher?.name}
        </Button>
      </Link>
    );
  }
}
