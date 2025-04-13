import RegisterCard from "~/components/custom/auth/register-card";
import SetSchedule from "~/app/lk/all-schedules/_lib/utils/set-schedule";
import { api } from "~/trpc/server";

const Register = async () => {
  const [groups, teachers] = await Promise.all([
    api.groups.get(),
    api.teachers.get(),
  ]);

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <SetSchedule groups={groups} teachers={teachers}>
        <RegisterCard />
      </SetSchedule>
    </div>
  );
};

export default Register;
