# sdk.py
import json
from unic2_asset_sdk.core.auth import get_access_token
from unic2_asset_sdk.ws_client import WsClient


class unic2AssetSdk:
    def __init__(self):
        self.wsClient = None        # instead of self.ws
        self.assetId = None

    def init(self, authUrl, realm, assetId, assetSecret, wsServiceUrl):
        self.authUrl = authUrl
        self.assetId = assetId
        self.realm=realm
        self.assetSecret=assetSecret

        #initiate web socket client
        self.wsClient = WsClient(
            wsServiceUrl=wsServiceUrl,
            getTokenFn=self.getFreshToken
        )
        self.wsClient.start()

    def getFreshToken(self):
        return get_access_token(self.authUrl, self.realm, self.assetId, self.assetSecret)

    def sendUpdateByWS(self, payload: dict):
        if not self.wsClient:
            print("WS client not initialized")
            return
        message = {"type": "update", "data": payload}
        self.wsClient.send(json.dumps(message))