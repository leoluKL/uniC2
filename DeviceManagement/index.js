import express from "express"
import deviceRoutes from "./routes/deviceRoutes.js"
import cors from "cors"
import { initKeycloakCache } from "./services/keycloakService.js"

const app = express()
app.use(express.json())
await initKeycloakCache()        // <-- run once on startup

// ✅ Allow defined origins but handle missing origin safely
const allowedOrigins = ["http://localhost:5173", "https://unic2.stenmss.org"]

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
      callback(null, true)
    } else {
      console.warn("Blocked by CORS:", origin)
      callback(new Error("Not allowed by CORS"))
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}

// ✅ Handle all CORS preflights explicitly
app.use(cors(corsOptions))

// Routes
app.use("/api/device", deviceRoutes)

// Health check
app.get("/", (req, res) => {
  res.send("DeviceManagement API is running")
})

const PORT = process.env.PORT || 8081
app.listen(PORT, () => console.log(`DeviceManagement API running on ${PORT}`))