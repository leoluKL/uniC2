import 'dotenv/config'
import jwt from 'jsonwebtoken'
import crypto from "crypto"

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://unic2keycloak.stenmss.org'
const REALM = process.env.KEYCLOAK_REALM || 'unic2'
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'unic2-devicemanagement-backend'
const CLIENT_SECRET = process.env.KEYCLOAK_DEVICEMANAGEMENTCLIENTSECRET

let UNIC2_ASSET_SCOPE_ID = null

export async function initKeycloakCache() {
    const token = await getAdminToken()
    const scopeRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/client-scopes`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    const scopes = await scopeRes.json()
    const scope = scopes.find(s => s.name === "unic2-asset-scope")
    if (!scope) throw new Error("Scope not found: unic2-asset-scope")
    UNIC2_ASSET_SCOPE_ID = scope.id
}

// ✅ Fetch and cache valid PEM key (same as test.js)
async function getPublicKey() {
    const res = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`)
    const data = await res.json()
    const key = data.keys.find(k => k.use === "sig" && k.kty === "RSA")

    const jwk = { kty: "RSA", n: key.n, e: key.e }
    const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" })
    const pem = publicKey.export({ type: "pkcs1", format: "pem" }) // ✅ exact "RSA PUBLIC KEY"

    return pem
}

// 🔹 Verify JWT and check role (must have role) and aud must have the client_id of this backend
export function requireRole(role) {
    return async (req, res, next) => {
        const auth = req.headers.authorization
        if (!auth?.startsWith('Bearer ')) return res.status(403).json({ error: 'Missing token' })
        const token = auth.split(' ')[1]
        try {
            const decoded = jwt.verify(token, await getPublicKey(), { algorithms: ["RS256"] })
            const roles = decoded.realm_access?.roles || []
            if (!decoded.aud?.includes(CLIENT_ID)) return res.status(403).json({ error: 'Invalid audience' })
            if (!roles.includes(role)) return res.status(403).json({ error: 'Forbidden: missing role' })
            return next()
        } catch (err) {
            console.error('❌ Invalid token:', err.message)
            return res.status(403).json({ error: 'Invalid token' })
        }
    }
}

// 🔹 Admin token fetch remains the same
export async function getAdminToken() {
    //console.log({KEYCLOAK_URL,REALM,CLIENT_ID,CLIENT_SECRET})
    const res = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        })
    })
    if (!res.ok) throw new Error(`Token request failed: ${res.status}`)
    const data = await res.json()
    return data.access_token
}

export async function createClient({ clientId,assetType }) {
    const token = await getAdminToken()
    const generatedSecret = crypto.randomBytes(24).toString('hex')

    const assetAttr = { platform: 'unic2', assetType }
    const createRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/clients`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            clientId,
            enabled: true,
            publicClient: false,
            secret: generatedSecret,
            serviceAccountsEnabled: true,
            attributes: { ...assetAttr }
        })
    })

    const location = createRes.headers.get("Location")
    if (!location) throw new Error("Missing Location header from create client")
    const clientUUID = location.split("/").pop()

    if (!UNIC2_ASSET_SCOPE_ID) throw new Error("ASSET_SCOPE_ID not initialized")

    const attachRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${clientUUID}/default-client-scopes/${UNIC2_ASSET_SCOPE_ID}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
    })

    return { clientId, secret: generatedSecret, attributes: { ...assetAttr } }
}

export async function listAssetClients() {
    const token = await getAdminToken()
    const res = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/clients`, {
        headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error(`Failed to fetch clients: ${res.status}`)
    const clients = await res.json()
    return clients
        .filter(c => c.attributes?.platform === 'unic2')
        .map(c => ({
            id: c.id,
            clientId: c.clientId,
            attributes: c.attributes || {},
            raw:{...c}
        }))
}

// 🔹 Fetch client secret
export async function getClientSecret(clientId) {
  const token = await getAdminToken()
  const clientsRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/clients?clientId=${clientId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!clientsRes.ok) throw new Error(`Failed to find client: ${clientsRes.status}`)
  const clients = await clientsRes.json()
  if (!clients.length) throw new Error(`Client not found: ${clientId}`)

  const clientUUID = clients[0].id
  const secretRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${clientUUID}/client-secret`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!secretRes.ok) throw new Error(`Failed to get secret: ${secretRes.status}`)
  return await secretRes.json()
}

export async function deleteClient(clientId) {
  const token = await getAdminToken();

  // first find the client UUID by clientId
  const findRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/clients?clientId=${clientId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!findRes.ok) throw new Error(`Failed to find client: ${findRes.status}`);
  const list = await findRes.json();
  if (!list.length) throw new Error(`Client not found: ${clientId}`);

  const clientUUID = list[0].id;

  // then delete that client
  const delRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${clientUUID}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!delRes.ok) throw new Error(`Failed to delete client: ${delRes.status}`);

  return { clientId, deleted: true };
}
