import { useEffect, useState, useContext } from "react";
import { AuthContext } from "./AuthProvider.jsx";
import AssetCard from "./Assetcard.jsx";

export default function App() {
  const { sdkManager } = useContext(AuthContext);

  const [userName, setUserName] = useState("");
  const [assetsStatus, setAssetsStatus] = useState({});
  const [subscribedAssets, setSubscribedAssets] = useState({});
  const [updatesByAssetId, setUpdatesByAssetId] = useState({});

  const appendAssetUpdate = (assetId, line) => {
    setUpdatesByAssetId(prev => {
      const list = prev[assetId] || [];
      const nextList = [new Date().toISOString() + " " + line, ...list];
      return { ...prev, [assetId]: nextList.slice(0, 200) };
    });
  };

  const refreshAssetsStatus = async () => {
    try {
      const res = await sdkManager.getCurrentAssetsOnlineStatus();
      setAssetsStatus(res || {});
    } catch (e) {
      console.log("fetch assets status failed", e);
    }
  };

  useEffect(() => {
    setUserName(sdkManager.kc.tokenParsed?.preferred_username || "");

    sdkManager.setOnCommandIOConnected(() => {
      refreshAssetsStatus();
    });

    sdkManager.setOnAssetOnline((assetId) => {
      appendAssetUpdate(assetId, "[asset] online");
      setAssetsStatus(prev => ({ ...prev, [assetId]: { ...(prev[assetId] || {}), online: true, ts: Date.now() } }));
    });

    sdkManager.setOnAssetOffline((assetId) => {
      appendAssetUpdate(assetId, "[asset] offline");
      setAssetsStatus(prev => ({ ...prev, [assetId]: { ...(prev[assetId] || {}), online: false, ts: Date.now() } }));
    });

    sdkManager.setOnAssetUpdate((assetId, payload) => {
      appendAssetUpdate(assetId, "[update] " + JSON.stringify(payload));
      setAssetsStatus(prev => ({ ...prev, [assetId]: { ...(prev[assetId] || {}), ts: Date.now() } }));
    });

    refreshAssetsStatus();
  }, []);

  const handleLogout = () => {
    sdkManager.kc.logout({ redirectUri: window.location.origin });
  };

  const handleSubscribe = async (assetId) => {
    try {
      await sdkManager.subscribeAsset([assetId]);
      setSubscribedAssets(prev => ({ ...prev, [assetId]: true }));
      appendAssetUpdate(assetId, "[sub] ok");
    } catch (e) {
      appendAssetUpdate(assetId, "[sub] failed: " + e);
    }
  };

  const handleUnsubscribe = async (assetId) => {
    try {
      await sdkManager.unsubscribeAsset([assetId]);
      setSubscribedAssets(prev => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
      appendAssetUpdate(assetId, "[unsub] ok");
    } catch (e) {
      appendAssetUpdate(assetId, "[unsub] failed: " + e);
    }
  };

  const handleSendCommand = async (assetId, payloadObj) => {
    try {
      await sdkManager.sendCommandToAsset(assetId, payloadObj);
      appendAssetUpdate(assetId, "[cmd] sent " + JSON.stringify(payloadObj));
    } catch (e) {
      appendAssetUpdate(assetId, "[cmd] failed: " + e);
    }
  };

  const assetIds = Object.keys(assetsStatus || {}).sort();

  return (
    <div className="min-h-screen w-screen bg-gray-900 text-green-200">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl">{userName}</div>
            <div className="text-sm text-green-300/70">WS: {String(sdkManager.getCommandIOStatus())}</div>
          </div>
          <div className="flex gap-3">
            <button onClick={refreshAssetsStatus} className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600">Refresh Assets</button>
            <button onClick={handleLogout} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-500">Logout</button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {assetIds.length === 0 && <div className="text-green-300/70">No assets returned yet.</div>}

          {assetIds.map(assetId => (
            <AssetCard
              key={assetId}
              assetId={assetId}
              status={assetsStatus[assetId]}
              subscribed={subscribedAssets[assetId] === true}
              onSubscribe={handleSubscribe}
              onUnsubscribe={handleUnsubscribe}
              onSendCommand={handleSendCommand}
              updates={updatesByAssetId[assetId] || []}
            />
          ))}
        </div>
      </div>
    </div>
  );
}