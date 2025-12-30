import { useEffect, useState, useContext } from "react";
import { AuthContext } from "./AuthProvider.jsx";

export default function App() {
  const [userName, setUserName] = useState("");
  const { sdkManager } = useContext(AuthContext);

  const [assetsStatus, setAssetsStatus] = useState({});
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [subscribedAssets, setSubscribedAssets] = useState({});
  const [commandText, setCommandText] = useState("{}");
  const [updatesText, setUpdatesText] = useState("");

  const refreshAssetsStatus = async () => {
    try {
      const res = await sdkManager.getCurrentAssetsOnlineStatus();
      setAssetsStatus(res || {});
    } catch (e) {
      setUpdatesText(prev => `[error] fetch assets status failed: ${e}\n` + prev);
    }
  };

  const appendUpdate = (line) => {
    setUpdatesText(prev => `${new Date().toISOString()} ${line}\n` + prev);
  };

  useEffect(() => {
    setUserName(sdkManager.kc.tokenParsed?.preferred_username || "");

    sdkManager.setOnCommandIOConnected(() => {
      appendUpdate(`[ws] connected=${sdkManager.getCommandIOStatus()}`);
      refreshAssetsStatus();
    });

    sdkManager.setOnAssetOnline((assetId) => {
      appendUpdate(`[asset] online ${assetId}`);
      setAssetsStatus(prev => ({ ...prev, [assetId]: { ...(prev[assetId] || {}), online: true, ts: Date.now() } }));
    });

    sdkManager.setOnAssetOffline((assetId) => {
      appendUpdate(`[asset] offline ${assetId}`);
      setAssetsStatus(prev => ({ ...prev, [assetId]: { ...(prev[assetId] || {}), online: false, ts: Date.now() } }));
      setSubscribedAssets(prev => {
        if (!prev[assetId]) return prev;
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
    });

    sdkManager.setOnAssetUpdate((assetId, payload) => {
      appendUpdate(`[update] ${assetId} ${JSON.stringify(payload)}`);
      setAssetsStatus(prev => ({ ...prev, [assetId]: { ...(prev[assetId] || {}), ts: Date.now() } }));
    });

    refreshAssetsStatus();
  }, []);

  const handleLogout = () => {
    sdkManager.kc.logout({ redirectUri: window.location.origin });
  };

  const handleSubscribe = async (assetId) => {
    try {
      await sdkManager.subscribeAsset(assetId);
      setSubscribedAssets(prev => ({ ...prev, [assetId]: true }));
      appendUpdate(`[sub] ${assetId}`);
      setSelectedAssetId(assetId);
    } catch (e) {
      appendUpdate(`[error] subscribe ${assetId} failed: ${e}`);
    }
  };

  const handleUnsubscribe = async (assetId) => {
    try {
      await sdkManager.unsubscribeAsset(assetId);
      setSubscribedAssets(prev => {
        const next = { ...prev };
        delete next[assetId];
        return next;
      });
      appendUpdate(`[unsub] ${assetId}`);
      if (selectedAssetId === assetId) setSelectedAssetId("");
    } catch (e) {
      appendUpdate(`[error] unsubscribe ${assetId} failed: ${e}`);
    }
  };

  const handleSendCommand = async () => {
    if (!selectedAssetId) {
      appendUpdate("[error] select an asset first");
      return;
    }

    let payloadObj;
    try {
      payloadObj = commandText ? JSON.parse(commandText) : {};
    } catch (e) {
      appendUpdate(`[error] command JSON invalid: ${e}`);
      return;
    }

    try {
      await sdkManager.sendCommandToAsset(selectedAssetId, payloadObj);
      appendUpdate(`[cmd] sent to ${selectedAssetId} ${JSON.stringify(payloadObj)}`);
    } catch (e) {
      appendUpdate(`[error] sendCommand failed: ${e}`);
    }
  };

  const assetIds = Object.keys(assetsStatus || {}).sort();

  return (
    <div className="min-h-screen w-screen bg-gray-900 text-green-200">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl">{userName}</div>
            <div className="text-sm text-green-300/70">WS: {String(sdkManager.getCommandIOStatus())}</div>
          </div>
          <div className="flex gap-3">
            <button onClick={refreshAssetsStatus} className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600">
              Refresh Assets
            </button>
            <button onClick={handleLogout} className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-500">
              Logout
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/60 rounded p-4">
            <div className="text-lg mb-3">Assets</div>

            {assetIds.length === 0 && <div className="text-green-300/70">No assets returned yet.</div>}

            <div className="flex flex-col gap-2">
              {assetIds.map(assetId => {
                const st = assetsStatus[assetId] || {};
                const online = st.online === true;
                const subscribed = subscribedAssets[assetId] === true;

                return (
                  <div key={assetId} className="flex items-center justify-between bg-slate-900/60 rounded px-3 py-2">
                    <div className="flex flex-col">
                      <div className="text-base">{assetId}</div>
                      <div className={`text-sm ${online ? "text-green-300" : "text-red-300"}`}>
                        {online ? "online" : "offline"}
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => setSelectedAssetId(assetId)}
                        className={`px-2 py-1 rounded ${selectedAssetId === assetId ? "bg-emerald-600 text-white" : "bg-slate-700 text-white hover:bg-slate-600"}`}
                      >
                        Select
                      </button>

                      {online && !subscribed && (
                        <button onClick={() => handleSubscribe(assetId)} className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500">
                          Subscribe
                        </button>
                      )}
                      {subscribed && (
                        <button onClick={() => handleUnsubscribe(assetId)} className="px-2 py-1 rounded bg-slate-600 text-white hover:bg-slate-500">
                          Unsub
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800/60 rounded p-4">
            <div className="text-lg mb-3">Command</div>

            <div className="text-sm text-green-300/70 mb-2">
              Selected asset: <span className="text-green-200">{selectedAssetId || "(none)"}</span>
            </div>

            <textarea
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              className="w-full h-28 p-2 rounded bg-slate-900 text-green-200 text-sm outline-none"
              placeholder='{"cmd":"ping"}'
            />

            <div className="mt-3 flex gap-2">
              <button onClick={handleSendCommand} className="px-3 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-500">
                Send Command
              </button>
              <button onClick={() => setUpdatesText("")} className="px-3 py-2 bg-slate-700 text-white rounded hover:bg-slate-600">
                Clear Updates
              </button>
            </div>

            <div className="mt-4">
              <div className="text-lg mb-2">Updates</div>
              <textarea readOnly value={updatesText} className="w-full h-64 p-2 rounded bg-slate-900 text-green-200 text-xs outline-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}