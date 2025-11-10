import express from "express";
const app = express();
const PORT = process.env.PORT || 8081;
app.use(express.json());
app.get("/", (req, res) => res.send("Unic2 DeviceManagement backend running"));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));