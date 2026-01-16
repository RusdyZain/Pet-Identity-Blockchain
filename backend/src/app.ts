import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

// Inisialisasi aplikasi Express.
const app = express();

// Middleware umum untuk CORS dan JSON body.
app.use(cors());
app.use(express.json());

// Health check sederhana untuk memastikan server hidup.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Daftarkan seluruh route API.
app.use(routes);
// Handler error global agar response konsisten.
app.use(errorHandler);

export default app;
