import { redirect } from "next/navigation";

export const dynamic = "force-static";

export default async function Home() {
  return redirect('/lk')

}
