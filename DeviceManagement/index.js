import express from "express"
import deviceRoutes from "./routes/deviceRoutes.js"
import cors from "cors"

const app = express()
app.use(express.json())

app.use(cors({
  origin: ["http://localhost:5173", "https://unic2.stenmss.org"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

// ✅ no keycloak middleware needed — JWT verification happens inside route-level requireRole
app.use("/api/device", deviceRoutes)

const PORT = process.env.PORT || 8081
app.listen(PORT, () => console.log(`DeviceManagement API running on ${PORT}`))