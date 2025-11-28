from unic2_asset_sdk.core.auth import get_access_token

class unic2AssetSdk:
    def __init__(self):
        self.access_token = None

    def init(self, authUrl, realm, assetId, assetSecret):
        self.access_token = get_access_token(authUrl, realm, assetId, assetSecret)