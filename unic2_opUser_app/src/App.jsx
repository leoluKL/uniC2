import { useEffect } from "react";
import unic2OpUserSdk from "unic2-opuser-sdk";

export default function App() {

  useEffect(() => {
    const sdk = new unic2OpUserSdk({
      authUrl: "https://unic2keycloak.stenmss.org",  // your Keycloak URL
      clientId: "unic2app-frontend",                            // your client ID
      realm: "unic2",                                // your realm
      wsUrl: ""                                      // fill later
    });
    
    /*
    sdk.readyPromise.then(()=>{
      console.log(sdk.accessToken)
    })
    */
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-green-500 text-white text-4xl">
      Hello
    </div>
  );
}