from unic2_asset_sdk import unic2AssetSdk
import time

sdk = unic2AssetSdk()
sdk.init(
    authUrl="https://unic2keycloak.stenmss.org",
    realm="unic2",
    assetId="test-device-002",
    assetSecret="2ea38e11bc4b597bde02d23fa3b371864287e2c28b4f31c5",
    # wsServiceUrl="wss://unic2ws.stenmss.org"
    wsServiceUrl="ws://localhost:8082"
)

# prevent script from exiting
while True:
    sdk.sendUpdateByWS({"b":2})
    time.sleep(1)
