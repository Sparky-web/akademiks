import { getServerAuthSession } from "~/server/auth";
import SetUserProvider from "./_lib/providers/set-user";
import Menu from "../../components/custom/menu";
import InstallProvider from "./_lib/providers/install";

export default async function LkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();

  const user = session?.user || null;

  return (
    <div className="max-lg:app-container grid min-h-screen max-lg:pt-6 max-lg:pb-[calc(16px+84px)] lg:grid lg:h-screen lg:grid-cols-[250px_1fr]">
      <SetUserProvider userData={user}>
        <InstallProvider>
          <Menu />
          <div className="lg:relative lg:h-full lg:overflow-y-auto lg:px-10 lg:py-8">
            {children}
          </div>
        </InstallProvider>
      </SetUserProvider>
    </div>
  );
}
