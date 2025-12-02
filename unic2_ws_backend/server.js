// asset-ws-backend/server.js
import 'dotenv/config'
import http from "http";
import { WebSocketServer } from "ws";
import * as jose from "jose";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL
const REALM = process.env.KEYCLOAK_REALM
const ISSUER = `${KEYCLOAK_URL}/realms/${REALM}`
const JWKS = jose.createRemoteJWKSet(new URL(`${ISSUER}/protocol/openid-connect/certs`))

const PORT = process.env.PORT

// In-memory connection & subscription registry
const asset_ws_map = new Map()          
const opUser_ws_map = new Map()         
const opUser_subscribedAssets_map = new Map()      

// Keycloak JWKS verification
async function authenticateAndIdentify(req) {
    const protoHeader = req.headers["sec-websocket-protocol"]
    if (!protoHeader) throw new Error("Missing Sec-WebSocket-Protocol")
    const token = protoHeader.split(",")[0].trim()
    const { payload } = await jose.jwtVerify(token, JWKS, {
        issuer: ISSUER,
        algorithms: ["RS256"]
    })
    console.log(payload)
    // asset
    if (payload.asset_access?.platform === "unic2") {
        const assetId = payload.client_id || payload.sub || payload.preferred_username
        return { type: "asset", id: assetId }
    }

    // opUser
    if (payload.opUser_access?.platform === "unic2") {
        const userId = payload.preferred_username || payload.sub
        return { type: "opUser", id: userId }
    }

    throw new Error("Unknown identity type")
}

const server = http.createServer()
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req, identityInfo) => {
    ws.identityInfo=identityInfo;
    if (identityInfo.type === "asset") {
        asset_ws_map.set(identityInfo.id, ws)
        console.log(`Asset connected: ${identityInfo.id}`)
    } else if (identityInfo.type === "opUser") {
        opUser_ws_map.set(identityInfo.id, ws)
        if (!opUser_subscribedAssets_map.has(identityInfo.id)) opUser_subscribedAssets_map.set(identityInfo.id, new Set())
        console.log(`opUser connected: ${identityInfo.id}`)
    }

    ws.on("message", raw => {
        let msg
        try { msg = JSON.parse(raw.toString()) } catch { return }

        if (identityInfo.type === "opUser") {
            handleOpUserMessage(identityInfo.id, ws, msg)
        } else if (identityInfo.type === "asset") {
            handleAssetMessage(identityInfo.id, ws, msg)
        }
    })

    ws.on("close", () => {
        if (identityInfo.type === "asset") {
            asset_ws_map.delete(identityInfo.id)
            console.log(`Asset disconnected: ${identityInfo.id}`)
            // later: publish update:asset:<id> { __system: "offline" }
        } else if (identityInfo.type === "opUser") {
            opUser_ws_map.delete(identityInfo.id)
            opUser_subscribedAssets_map.delete(identityInfo.id)
            console.log(`opUser disconnected: ${identityInfo.id}`)
        }
    })
})

function handleOpUserMessage(opUserId, ws, msg) {
    if (msg.subscribe && Array.isArray(msg.subscribe)) {
        const subscribedAssets = opUser_subscribedAssets_map.get(opUserId) || new Set()
        msg.subscribe.forEach(id => subscribedAssets.add(id))
        opUser_subscribedAssets_map.set(opUserId, subscribedAssets)
        console.log(`opUser ${opUserId} subscribed to`, Array.from(subscribedAssets))
        return
    }

    if (msg.unsubscribe && Array.isArray(msg.unsubscribe)) {
        const subscribedAssets = opUser_subscribedAssets_map.get(opUserId)
        if (subscribedAssets) {
            msg.unsubscribe.forEach(id => subscribedAssets.delete(id))
            console.log(`opUser ${opUserId} subscriptions now`, Array.from(subscribedAssets))
        }
        return
    }

    if (msg.toAsset) {
        const assetId = msg.toAsset
        const payload = msg.payload
        if (!payload) return

        const assetWs = asset_ws_map.get(assetId)
        if (assetWs && assetWs.readyState === WebSocket.OPEN) {
            assetWs.send(JSON.stringify(payload))
            console.log(`Command from ${opUserId} → asset ${assetId}`, payload)
        } else {
            console.log(`Asset ${assetId} not connected on this node`)
            // later: publish cmd:asset:<id> to Redis
        }
        return
    }

    // ignore unknown opUser messages for now
}

function handleAssetMessage(assetId, ws, msg) {
    opUser_ws_map.forEach((opUserWs, opUserId) => {
        const subscribedAssets = opUser_subscribedAssets_map.get(opUserId)
        if (subscribedAssets && subscribedAssets.has(assetId) && opUserWs.readyState === WebSocket.OPEN) {
            opUserWs.send(JSON.stringify({ "asset":assetId, payload: msg }))
        }
    })

    console.log(`Update from asset ${assetId}`, msg)
    // later: publish update:asset:<id> to Redis
}

server.on("upgrade", async (req, socket, head) => {
    let identityInfo
    try {
        identityInfo = await authenticateAndIdentify(req)
        wss.handleUpgrade(req, socket, head, ws => {
            wss.emit("connection", ws, req, identityInfo)
        })
    } catch (err) {
        console.error("Auth failed:", err.message)
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n")
        socket.destroy()
        return
    }
})

//health is for loadbalancer target group health check
server.on("request", (req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
        return;
    }
});

server.listen(PORT, () => {
    console.log(`Asset WS backend listening on port ${PORT}`)
})