import { useEffect,useState,useContext } from "react";
import { useNavigate } from "react-router-dom"
import { AuthContext } from "./AuthProvider.jsx";

export default function App() {
  const navigate = useNavigate()
  const [userName, setUserName]= useState("");
  const {sdkManager} = useContext(AuthContext);

  useEffect(() => {  
    //console.log(sdkManager.kc.token)
    setUserName(sdkManager.kc.tokenParsed?.preferred_username )
  }, []);

  const handleLogout = () => {
    sdkManager.kc.logout({ redirectUri: window.location.origin })
  }

  return (
    <div className="flex flex-col bg-green-500 items-center justify-center min-h-screen w-screen text-green-200 text-2xl">
      <p>{userName}</p>

      <div className="mt-4 flex gap-4">
        <button onClick={() => navigate("/assetsmanagement")} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Go to Assets Management
        </button>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
          Logout
        </button>
      </div>
    </div>
  );
}