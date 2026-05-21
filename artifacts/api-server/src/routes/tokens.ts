import { Router } from "express";
import { getWatchedTokens } from "../services/botService";

const router = Router();

router.get("/tokens/watched", (_req, res) => {
  res.json(getWatchedTokens());
});

export default router;
