from unic2_asset_sdk.sdk import unic2AssetSdk

sdk = unic2AssetSdk()
sdk.init(
    authUrl="https://unic2keycloak.stenmss.org",
    realm="unic2",
    assetId="test-device-001",
    assetSecret="7968acd48eb2730877f363f50e98b0c41887b641149884d4"
)

print("TOKEN =")
print(sdk.access_token)