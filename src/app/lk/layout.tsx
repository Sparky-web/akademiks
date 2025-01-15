import { redirect } from "next/navigation"
// import session from "~/lib/session"
import { getServerAuthSession } from "~/server/auth"
import SetUserProvider from "./_lib/providers/set-user"
import { api } from "~/trpc/server"
import DateTime from "~/lib/utils/datetime"
import Menu from "../../components/custom/menu"
import InstallProvider from "./_lib/providers/install"
import { Toaster } from "~/components/ui/toaster"

export default async function LkLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerAuthSession()

    if (session?.user?.groupId) {
        void api.schedule.get.prefetch({ groupId: session.user?.groupId, weekStart: DateTime.now().startOf('week').toJSDate() })
    } else if (session?.user?.teacherId) {
        void api.schedule.get.prefetch({ teacherId: session.user?.teacherId, weekStart: DateTime.now().startOf('week').toJSDate() })
    }

    const user = session?.user || null

    return (
        <div className="max-lg:container max-lg:pt-6 max-lg:pb-[calc(16px+84px)] lg:grid lg:grid-cols-[250px,1fr] lg:h-screen min-h-screen grid">
            <SetUserProvider userData={user}>
                <InstallProvider>
                    <Menu />
                    {/* <Suspense fallback="loading..."> */}
                    <div className="lg:h-full lg:overflow-y-auto lg:py-8 lg:px-10 lg:relative">
                        {children}
                    </div>
                    {/* <Toaster /> */}
                    {/* </Suspense> */}
                </InstallProvider>
            </SetUserProvider>
        </div>
    )
}