import { Dashboard } from "@/components/dashboard/dashboard"
import { Lander } from "@/components/lander"
import { getSessionUserId } from "@/helpers/api/session"

const HomePage = async () => {
  const userId = await getSessionUserId()
  return userId ? <Dashboard userId={userId} /> : <Lander />
}

export default HomePage
