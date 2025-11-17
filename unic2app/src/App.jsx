import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

export default function App({ keycloak }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!window._loggedOnce) {
      console.log(keycloak.token)
      window._loggedOnce = true
    }

    if (!keycloak?.authenticated) return
    const refreshInterval = setInterval(async () => {
      try {
        const refreshed = await keycloak.updateToken(60)
        if (refreshed) console.log("🔄 Token refreshed")
      } catch (err) {
        console.error("Token refresh failed, redirecting to login")
        keycloak.login()
      }
    }, 240000) // every 4 min

    return () => clearInterval(refreshInterval)
  }, [keycloak])

  const handleLogout = () => {
    keycloak.logout({ redirectUri: window.location.origin })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-screen text-green-400 text-2xl">
      <p>Logged in as: {keycloak.tokenParsed?.preferred_username}</p>

      <div className="mt-4 flex gap-4">
        <button onClick={() => navigate("/assetsmanagement")} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Go to Assets Management
        </button>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Logout
        </button>
      </div>
    </div>
  )
}