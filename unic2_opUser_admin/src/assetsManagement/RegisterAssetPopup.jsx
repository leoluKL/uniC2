import React, { useState } from "react";

function RegisterAssetPopup({ onSubmit, onCancel }) {
  const [clientId, setClientId] = useState("");
  const [assetType, setAssetType] = useState("Drone");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white p-4 rounded-lg shadow-md w-80 text-gray-800">
        <h2 className="text-lg font-bold mb-2">Register New Asset</h2>
        <div className="mb-3">
          <label className="block text-sm mb-1">ID:</label>
          <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)}
            className="border border-gray-400 w-full px-2 py-1 rounded" />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Asset Type:</label>
          <select value={assetType} onChange={(e) => setAssetType(e.target.value)}
            className="border border-gray-400 w-full px-2 py-1 rounded">
            <option value="Drone">Drone</option>
            <option value="RobotDog">RobotDog</option>
            <option value="Vehicle">Vehicle</option>
          </select>
        </div>
        <div className="flex justify-between mt-4">
          <button onClick={() => onSubmit({ clientId, assetType })}
            className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-green-500 transition">OK</button>
          <button onClick={onCancel}
            className="bg-gray-400 text-white px-4 py-1 rounded hover:bg-gray-500 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default RegisterAssetPopup;