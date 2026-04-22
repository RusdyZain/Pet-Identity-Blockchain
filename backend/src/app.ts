import express from "express";
import cors from "cors";
import path from "path";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import morgan from "morgan"
// Inisialisasi aplikasi Express.
const app = express();

// Middleware umum untuk CORS dan JSON body.
app.use(cors());
app.use(express.json());
app.use(morgan("dev"))
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// Health check sederhana untuk memastikan server hidup.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Daftarkan seluruh route API.
app.use(routes);
// Handler error global agar response konsisten.
app.use(errorHandler);

export default app;
