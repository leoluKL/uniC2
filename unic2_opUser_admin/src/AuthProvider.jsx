import { createContext, useEffect, useState } from "react";
import sdkManager from "./sdkManager";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    sdkManager.readyPromise.then(() => {
      setReady(true);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ sdkManager}}>
        {!ready &&
            <div className="flex bg-black items-center justify-center min-h-screen w-screen text-white text-2xl">Loading...</div>
        }
        {ready &&
            children
        }
    </AuthContext.Provider>
  );
}