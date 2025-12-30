import { useMemo, useState , useRef, useEffect } from "react";

export default function AssetCard({ assetId, status, subscribed, onSubscribe, onUnsubscribe, onSendCommand, updates }) {
  const [commandText, setCommandText] = useState("{}");

  const updatesRef = useRef(null);

  const online = status?.online === true;
  const onlineText = online ? "online" : "offline";
  const onlineClass = online ? "text-green-300" : "text-red-300";

  const updatesText = useMemo(() => {
    if (!updates || updates.length === 0) return "";
    return updates.slice().reverse().join("\n");
  }, [updates]);

  const handleSend = async () => {
    let payloadObj;
    try {
      payloadObj = commandText ? JSON.parse(commandText) : {};
    } catch (e) {
      return; // App will show error if you want; for now keep silent here
    }
    await onSendCommand(assetId, payloadObj);
  };

  useEffect(() => {
    if (updatesRef.current) {
      updatesRef.current.scrollTop = updatesRef.current.scrollHeight;
    }
  }, [updatesText]);

  return (
    <div className="bg-slate-800/60 rounded p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="text-lg">{assetId}</div>
          <div className={`text-sm ${onlineClass}`}>{onlineText}</div>
        </div>

        <div className="flex gap-2">
          {!subscribed && (
            <button onClick={() => onSubscribe(assetId)} className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500">
              Subscribe
            </button>
          )}
          {subscribed && (
            <button onClick={() => onUnsubscribe(assetId)} className="px-2 py-1 rounded bg-slate-600 text-white hover:bg-slate-500">
              Unsub
            </button>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm text-green-300/70 mb-2">Command (JSON)</div>
        <textarea value={commandText} onChange={(e) => setCommandText(e.target.value)} className="w-full h-24 p-2 rounded bg-slate-900 text-green-200 text-sm outline-none" />
        <div className="mt-2">
          <button disabled={!online} onClick={handleSend} className={`px-3 py-2 rounded text-white ${online ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-700 cursor-not-allowed"}`}>
            Send Command
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-sm text-green-300/70 mb-2">Updates</div>
        <textarea
        ref={updatesRef}
        readOnly value={updatesText} className="w-full h-48 p-2 rounded bg-slate-900 text-green-200 text-xs outline-none" />
      </div>
    </div>
  );
}