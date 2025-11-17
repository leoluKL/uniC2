import express from "express"
import deviceRoutes from "./routes/deviceRoutes.js"
import cors from "cors"

const app = express()
app.use(express.json())

// ✅ Enable CORS for all relevant origins and include OPTIONS handler
const corsOptions = {
  origin: ["http://localhost:5173", "https://unic2.stenmss.org"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}
app.use(cors(corsOptions))
app.options("*", cors(corsOptions)) // ✅ handle preflight requests explicitly

// ✅ no keycloak middleware needed — JWT verification happens inside route-level requireRole
app.use("/api/device", deviceRoutes)

// ✅ Root health check
app.get("/", (req, res) => {
  res.send("DeviceManagement API is running")
})

const PORT = process.env.PORT || 8081
app.listen(PORT, () => console.log(`DeviceManagement API running on ${PORT}`))