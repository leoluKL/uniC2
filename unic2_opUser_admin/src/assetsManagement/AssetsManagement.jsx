import { useState, useEffect,useContext } from "react"
import RegisterAssetPopup from "./RegisterAssetPopup.jsx"
import ConfirmDialog from "../utils/ConfirmDialog.jsx"
import { appConfig } from "../appConfig.js"
import { AuthContext } from "../AuthProvider.jsx"

export default function AssetsManagement({ }) {
    const {sdkManager} = useContext(AuthContext);
    const [assets, setAssets] = useState([])
    const [selectedAsset, setSelectedAsset] = useState(null)
    const [showPopup, setShowPopup] = useState(false)
    const [showConfirmUnregister, setShowConfirmUnregister]= useState(null)

    useEffect(() => {
        async function fetchAssets() {
            if (!sdkManager?.accessToken) return
            const res = await fetch(`${appConfig.assetManagementBackendUrl}/api/device/list`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sdkManager?.accessToken}`,
                    'Content-Type': 'application/json'
                }
            })
            const data = await res.json()
            setAssets(data)
        }
        fetchAssets()
    }, [sdkManager?.accessToken])

    async function downloadSecret(clientId){
        const res = await fetch(`${appConfig.assetManagementBackendUrl}/api/device/secret`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sdkManager?.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ clientId })
        })
        const data = await res.json()
        //console.log(data)

        const blob = new Blob([data.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${clientId}-secret.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    return (
        <div className="flex w-screen h-screen text-[14px] bg-gray-800 text-black">
            {/* Left Panel */}
            <div className="w-1/2 border-r border-black overflow-y-auto">
                <div className="bg-green-700 text-white font-bold text-center py-3 cursor-pointer"
                    onClick={()=>{setShowPopup(true)}}
                >
                    Register New Asset
                </div>
                {showPopup && (
                    <RegisterAssetPopup
                        onSubmit={async (data) => {
                            try {
                                const res = await fetch(`${appConfig.assetManagementBackendUrl}/api/device/create`, {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${sdkManager?.accessToken}`,
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        clientId: data.clientId,
                                        assetType: data.assetType
                                    })
                                });
                                if (!res.ok) throw new Error("Create asset failed");
                                await res.json();
                                setShowPopup(false);

                                // Refresh the asset list
                                const refreshed = await fetch(`${appConfig.assetManagementBackendUrl}/api/device/list`, {
                                    method: "POST",
                                    headers: {
                                        "Authorization": `Bearer ${sdkManager?.accessToken}`,
                                        "Content-Type": "application/json"
                                    }
                                });
                                const newData = await refreshed.json();
                                setAssets(newData);
                            } catch (err) {
                                console.error("Register asset failed:", err);
                            }
                        }}
                        onCancel={() => setShowPopup(false)}
                    />
                )}

                <div className="divide-y">
                    {assets.map(a => (
                        <div key={a.id}
                             className={`flex justify-between items-center bg-white p-3 space-x-4 cursor-pointer ${selectedAsset?.id === a.id ? "bg-blue-100" : ""}`}
                             onClick={() => setSelectedAsset(a)}>
                            <div className="flex-1">
                                <div className="font-semibold">{a.clientId}</div>
                                <div className="text-gray-600 text-sm">{a.attributes?.assetType || "Unknown Type"}</div>
                            </div>
                            <div className="flex items-center gap-6">
                                <button
                                    className="flex flex-col items-center text-sm text-blue-500 transition-colors duration-300"
                                    onClick={(e) => {
                                        const btn = e.currentTarget;
                                        btn.classList.add("bg-green-500"); // visual feedback
                                        setTimeout(() => btn.classList.remove("bg-green-500"), 300);
                                        downloadSecret(a.clientId);
                                    }}
                                >
                                    <i className="fas fa-download text-3xl"></i>
                                    Download Secret
                                </button>
                                <button className="flex flex-col items-center text-sm text-blue-500"
                                    onClick={()=>{setShowConfirmUnregister(a.clientId)}}
                                >
                                    <i className="fas fa-trash text-2xl"></i>Unregister
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel */}
            <div className="w-1/2 flex items-center justify-center border-l border-gray-300 text-white text-lg">
                {selectedAsset ? (
                    <div className="text-center">
                        <h2 className="text-xl font-semibold">{selectedAsset.clientId}</h2>
                        <p className="text-gray-300">{selectedAsset.attributes?.assetType || "Unknown Type"}</p>
                    </div>
                ) : (
                    <p className="text-gray-500">Select an asset to view details</p>
                )}
            </div>

            <ConfirmDialog
                show={showConfirmUnregister}
                onClose={() => setShowConfirmUnregister(null)}
                onConfirm={async () => {
                    try {
                        const res = await fetch(`${appConfig.assetManagementBackendUrl}/api/device/delete`, {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${sdkManager?.accessToken}`,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                clientId: showConfirmUnregister
                            })
                        });
                        if (!res.ok) throw new Error("Unregister asset failed:"+showConfirmUnregister);
                        await res.json();
                        setShowConfirmUnregister(null)

                        // Refresh the asset list
                        const refreshed = await fetch(`${appConfig.assetManagementBackendUrl}/api/device/list`, {
                            method: "POST",
                            headers: {
                                "Authorization": `Bearer ${sdkManager?.accessToken}`,
                                "Content-Type": "application/json"
                            }
                        });
                        const newData = await refreshed.json();
                        setAssets(newData);
                    } catch (err) {
                        console.error(err);
                    }
                }}
                width="w-1/2"
                title="Confirmation"
                message={`unregister ${showConfirmUnregister}?`}
                cancelText="No"
                confirmText="Yes"
            />
        </div>
    )
}