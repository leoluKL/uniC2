// asset-ws-backend/server.js
import 'dotenv/config'
import http from "http";
import { WebSocketServer } from "ws";
import * as jose from "jose";
import { createClient } from "redis";


const KEYCLOAK_URL = process.env.KEYCLOAK_URL
const REALM = process.env.KEYCLOAK_REALM
const ISSUER = `${KEYCLOAK_URL}/realms/${REALM}`
const JWKS = jose.createRemoteJWKSet(new URL(`${ISSUER}/protocol/openid-connect/certs`))
const REDIS_URL= process.env.REDIS_URL

const PORT = process.env.PORT

// In-memory connection & subscription registry
const asset_ws_map = new Map()          
const opUser_ws_map = new Map()         
const opUser_monitorAssets_map = new Map()      

//connect redis service
const redisPub = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: () => 2000   // retry every 2s forever
  }
});
const redisSub = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: () => 2000   // retry every 2s forever
  }
});


redisPub.on("error", err => console.error("Redis pub client error:", err));
redisPub.on("reconnecting", () => console.log("Redis pub client reconnecting..."));
redisPub.on("ready", () => console.log("Redis pub client connection is ready..."));
redisSub.on("error", err => console.error("Redis sub client error:", err));
redisSub.on("reconnecting", () => console.log("Redis sub client reconnecting..."));
redisSub.on("ready", () => console.log("Redis sub client connection is ready..."));
await redisPub.connect();
await redisSub.connect();
await redisSub.pSubscribe("cmd:asset:*", (message, channel) => {
  const assetId = channel.split(":")[2];
  const assetWs = asset_ws_map.get(assetId);
  if (assetWs && assetWs.readyState === 1) {
    assetWs.send({"type":"opCommand",payload:message});
  }
});
await redisSub.pSubscribe("update:asset:*", (message, channel) => {
  const assetId = channel.split(":")[2];

  opUser_ws_map.forEach((ws, opUserId) => {
    const monitorAssets = opUser_monitorAssets_map.get(opUserId);
    if (monitorAssets && monitorAssets.has(assetId) && ws.readyState === 1) {
      ws.send(JSON.stringify({ "type":"assetUpdate", asset: assetId, payload: JSON.parse(message) }));
    }
  });
});


// Keycloak JWKS verification
async function authenticateAndIdentify(req) {
    const protoHeader = req.headers["sec-websocket-protocol"]
    if (!protoHeader) throw new Error("Missing Sec-WebSocket-Protocol")
    const token = protoHeader.split(",")[0].trim()
    const { payload } = await jose.jwtVerify(token, JWKS, {
        issuer: ISSUER,
        algorithms: ["RS256"]
    })
    //console.log(payload)
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
        redisPub.publish(`update:asset:${identityInfo.id}`, {"online":true})
    } else if (identityInfo.type === "opUser") {
        opUser_ws_map.set(identityInfo.id, ws)
        if (!opUser_monitorAssets_map.has(identityInfo.id)) opUser_monitorAssets_map.set(identityInfo.id, new Set())
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
            redisPub.publish(`update:asset:${identityInfo.id}`, {"online":false})
        } else if (identityInfo.type === "opUser") {
            opUser_ws_map.delete(identityInfo.id)
            opUser_monitorAssets_map.delete(identityInfo.id)
            console.log(`opUser disconnected: ${identityInfo.id}`)
        }
    })
})

function handleOpUserMessage(opUserId, ws, msg) {
    if (msg.subscribe && Array.isArray(msg.subscribe)) {
        const monitorAssets = opUser_monitorAssets_map.get(opUserId) || new Set()
        msg.subscribe.forEach(id => monitorAssets.add(id))
        opUser_monitorAssets_map.set(opUserId, monitorAssets)
        console.log(`opUser ${opUserId} subscribed to`, Array.from(monitorAssets))
        return
    }

    if (msg.unsubscribe && Array.isArray(msg.unsubscribe)) {
        const monitorAssets = opUser_monitorAssets_map.get(opUserId)
        if (monitorAssets) {
            msg.unsubscribe.forEach(id => monitorAssets.delete(id))
            console.log(`opUser ${opUserId} subscriptions now`, Array.from(monitorAssets))
        }
        return
    }

    if (msg.toAsset) {
        const assetId = msg.toAsset
        const payload = msg.payload
        if (!payload) return

        redisPub.publish(`command:asset:${assetId}`, msg.payload)
        return
    }

    // ignore unknown opUser messages for now
}

async function handleAssetMessage(assetId, ws, msg) {
    await redisPub.publish(`update:asset:${assetId}`, JSON.stringify(msg))
    /*
    opUser_ws_map.forEach((opUserWs, opUserId) => {
        const monitorAssets = opUser_monitorAssets_map.get(opUserId)
        if (monitorAssets && monitorAssets.has(assetId) && opUserWs.readyState === WebSocket.OPEN) {
            opUserWs.send(JSON.stringify({ "asset":assetId, payload: msg }))
        }
    })
    */

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