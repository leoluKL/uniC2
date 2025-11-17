import express from "express"
import { requireRole } from "../services/keycloakService.js"
import { createClient,listAssetClients, getClientSecret,deleteClient } from "../services/keycloakService.js"

const router = express.Router()

router.post("/create", async (req, res, next) => {
  next()
}, requireRole("deviceprovision"), async (req, res) => {
  try {
    const { clientId,assetType } = req.body
    if (!clientId) return res.status(400).json({ error: "clientId required" })
    const result = await createClient({ clientId, assetType})
    res.json(result)
  } catch (err) {
    console.error("Create client failed:", err)
    res.status(500).json({ error: err.message })
  }
})

/* to test
curl -X POST http://localhost:8081/device/create \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"clientId": "test-device", assetType:"drone"}'
*/

// List all asset clients
router.post("/list", async (req, res, next) => next(), requireRole("deviceprovision"), async (req, res) => {
  try {
    const clients = await listAssetClients()
    res.json(clients)
  } catch (err) {
    console.error("List clients failed:", err)
    res.status(500).json({ error: err.message })
  }
})

router.post("/secret", requireRole("deviceprovision"), async (req, res) => {
  try {
    const { clientId } = req.body
    if (!clientId) return res.status(400).json({ error: "clientId required" })
    const secret = await getClientSecret(clientId)
    res.json(secret)
  } catch (err) {
    console.error("Get client secret failed:", err)
    res.status(500).json({ error: err.message })
  }
})

// Delete asset client
router.post("/delete", requireRole("deviceprovision"), async (req, res) => {
  try {
    const { clientId } = req.body
    if (!clientId) return res.status(400).json({ error: "clientId required" })
    const result = await deleteClient(clientId)
    res.json(result)
  } catch (err) {
    console.error("Delete client failed:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router