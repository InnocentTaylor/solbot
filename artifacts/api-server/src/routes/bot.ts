import { Router } from "express";
import {
  getBotState,
  startBot,
  stopBot,
} from "../services/botService";

const router = Router();

router.get("/bot/status", (_req, res) => {
  res.json(getBotState());
});

router.post("/bot/start", async (_req, res) => {
  await startBot();
  res.json(getBotState());
});

router.post("/bot/stop", async (_req, res) => {
  await stopBot();
  res.json(getBotState());
});

export default router;
