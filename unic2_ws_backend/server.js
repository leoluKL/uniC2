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
const REDIS_URL = process.env.REDIS_URL
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim());

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
        assetWs.send(JSON.stringify({ type: "opCommand", payload: JSON.parse(message) }))
    }
});
await redisSub.pSubscribe("update:asset:*", (message, channel) => {
    const assetId = channel.split(":")[2];

    opUser_ws_map.forEach((opUserWs, opUserId) => {
        const monitorAssets = opUser_monitorAssets_map.get(opUserId);
        if (monitorAssets && monitorAssets.has(assetId) && opUserWs.readyState === 1) {
            opUserWs.send(JSON.stringify({ "type": "assetUpdate", asset: assetId, payload: JSON.parse(message) }));
        }
    });
});


// Keycloak JWKS verification
async function authenticateAndIdentify(req,protocol) {
    let token = null;
    if (protocol == "ws") {
        const protoHeader = req.headers["sec-websocket-protocol"]
        if (!protoHeader) throw new Error("Missing Sec-WebSocket-Protocol")
        token = protoHeader.split(",")[0].trim()
    } else if (protocol == "http") {
        const auth = req.headers["authorization"];
        if (!auth || !auth.startsWith("Bearer ")) {
            throw new Error("Missing Authorization");
        }
        token = auth.slice(7);
    }
    
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

wss.on("connection", async (ws, req, identityInfo) => {
    ws.identityInfo = identityInfo;
    if (identityInfo.type === "asset") {
        asset_ws_map.set(identityInfo.id, ws)
        console.log(`Asset connected: ${identityInfo.id}`)
        const theKey = `asset:status:${identityInfo.id}`
        const [sec, micro] = await redisPub.time();
        const redisTS = Number(sec) * 1000 + Math.floor(Number(micro) / 1000);
        const prev = await redisPub.get(theKey);
        if (!prev || redisTS > JSON.parse(prev).ts) {
            redisPub.set(`asset:status:${identityInfo.id}`, JSON.stringify({ online: true, ts: redisTS }))
            redisPub.publish(`update:asset:${identityInfo.id}`, JSON.stringify({ "online": true }))
        }
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

    ws.on("close", async () => {
        if (identityInfo.type === "asset") {
            asset_ws_map.delete(identityInfo.id)
            console.log(`Asset disconnected: ${identityInfo.id}`)
            //redisPub.hDel("assets:online", identityInfo.id)
            const theKey=`asset:status:${identityInfo.id}`
            const [sec, micro] = await redisPub.time();
            const redisTS = Number(sec) * 1000 + Math.floor(Number(micro) / 1000);
            const prev = await redisPub.get(theKey);
            if (!prev || redisTS > JSON.parse(prev).ts) {
                redisPub.set(theKey, JSON.stringify({ online: false, ts: redisTS }), { EX: 30 * 24 * 3600 })
                redisPub.publish(`update:asset:${identityInfo.id}`, JSON.stringify({ "online": false }))
            }
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

        redisPub.publish(`cmd:asset:${assetId}`, JSON.stringify(msg.payload))
        return
    }

    // ignore unknown opUser messages for now
}

async function handleAssetMessage(assetId, ws, msg) {
    await redisPub.publish(`update:asset:${assetId}`, JSON.stringify(msg))
    console.log(`Update from asset ${assetId}`, msg)
    // later: publish update:asset:<id> to Redis
}

server.on("upgrade", async (req, socket, head) => {
    let identityInfo
    try {
        identityInfo = await authenticateAndIdentify(req,"ws")
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


function addCorsHeader(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
        res.setHeader("Vary", "Origin");
    }

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return true;
    }
    return false;
}

//health is for loadbalancer target group health check
server.on("request", async (req, res) => {
    if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("OK");
        return;
    }

    if (req.url === "/assetsOnlineStatus") {
        if (addCorsHeader(req, res)) return;
        try {
            await authenticateAndIdentify(req, "http")
        } catch (err) {
            res.writeHead(401);
            res.end("Unauthorized");
            return;
        }

        const result = {};
        let cursor = "0";

        do {
            const reply = await redisPub.scan(cursor, { MATCH: "asset:status:*", COUNT: 100 });
            cursor = reply.cursor;

            for (const key of reply.keys) {
                const val = await redisPub.get(key);
                if (!val) continue;
                const assetId = key.split(":")[2];
                result[assetId] = JSON.parse(val);
            }
        } while (cursor !== "0");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
        return;
    }
});

server.listen(PORT, () => {
    console.log(`Asset WS backend listening on port ${PORT}`)
})