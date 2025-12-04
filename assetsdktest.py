from unic2_asset_sdk.sdk import unic2AssetSdk
import time

sdk = unic2AssetSdk()
sdk.init(
    authUrl="https://unic2keycloak.stenmss.org",
    realm="unic2",
    assetId="test-device-001",
    assetSecret="7968acd48eb2730877f363f50e98b0c41887b641149884d4",
    # wsServiceUrl="wss://unic2ws.stenmss.org"
    wsServiceUrl="ws://localhost:8082"
)

# prevent script from exiting
while True:
    sdk.sendUpdateByWS({"a":1})
    time.sleep(1)
