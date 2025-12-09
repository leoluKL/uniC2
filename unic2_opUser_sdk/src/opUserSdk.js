// src/opUserSdk.js
import Keycloak from 'keycloak-js'
import WsClient from './core/wsClient';

export default class unic2OpUserSdk {
    static instance = null;

    constructor(config) {
        if (unic2OpUserSdk.instance) {
            return unic2OpUserSdk.instance;
        }

        // first time only
        this.authUrl = config.authUrl;
        this.clientId = config.clientId;
        this.realm = config.realm;
        this.wsUrl = config.wsUrl;

        this.kc = new Keycloak({
            url: this.authUrl,
            realm: this.realm,
            clientId: this.clientId
        });

        this.accessToken = null;
        this.refreshToken = null;

        this.onWebSocketConnected=()=>{} //NOTE: developer should use this one to subscribe Asset interests again as the new setup websocket maybe not in the same backend node
        this.onWebSocketDisconnected=()=>{}

        this.readyPromise = this._initLogin();

        unic2OpUserSdk.instance = this;
    }

    async _initLogin() {
        const auth = await this.kc.init({
            onLoad: "login-required",
            pkceMethod: "S256"
        });

        if (!auth) throw new Error("Keycloak login failed");

        this.accessToken = this.kc.token;
        this.refreshToken = this.kc.refreshToken;

        // auto refresh
        setInterval(() => {
            this.kc.updateToken(30).then(refreshed => {
                if (refreshed) {
                    this.accessToken = this.kc.token;
                }
            });
        }, 10000);

        if (this.wsUrl) {
            this.wsClient = new WsClient({
                wsUrl: this.wsUrl,
                getTokenFn: () => this.accessToken,
                onMsgCallback: (msg)=>{this._onWSRecivedMsg(msg)},
                onWebSocketConnected: ()=>{this.onWebSocketConnected()},
                onWebSocketDisconnected: ()=>{this.onWebSocketDisconnected()}
            });
        }
        return true;
    }

    sendCommandToAsset(assetId,payload) {
        if (!this.wsClient) {
            console.error("WS not connected");
            return false;
        }
        this.wsClient.send({"toAsset":assetId,payload});
        return true;
    }

    subscribeAsset(assetArr) {
        if (!this.wsClient) {
            console.error("WS not connected");
            return false;
        }
        this.wsClient.send({
            "subscribe":assetArr
        });
    }

    unsubscribeAsset(assetArr) {
        if (!this.wsClient) {
            console.error("WS not connected");
            return false;
        }
        this.wsClient.send({
            "unsubscribe":assetArr
        });
    }


    setOnAssetUpdate(fn) {
        this.onAssetUpdate = fn
    }

    setOnAssetOnline(fn) {
        this.onAssetOnline = fn
    }

    setOnAssetOffline(fn) {
        this.onAssetOffline = fn
    }

    getCommandIOStatus(){
        if(this.wsClient?.ws) return true
        else return false
    }

    setOnCommandIOConnected(fn){
        this.onWebSocketConnected = fn
    }
    setOnCommandIODisconnected(fn){
        this.onWebSocketDisconnected = fn
    }

    _onWSRecivedMsg(msg) {
        if (msg.type === "assetUpdate") {
            if (!msg.payload) return;
            if (msg.payload.online === true) {
                if (this.onAssetOnline) this.onAssetOnline(msg.asset)
            } else if (msg.payload.online === false) {
                if (this.onAssetOffline) this.onAssetOffline(msg.asset)
            } else {
                if (this.onAssetUpdate) this.onAssetUpdate(msg.asset, msg.payload)
            }
        }
    }

}