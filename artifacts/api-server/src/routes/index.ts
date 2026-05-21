import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botRouter from "./bot";
import configRouter from "./config";
import positionsRouter from "./positions";
import tradesRouter from "./trades";
import tokensRouter from "./tokens";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botRouter);
router.use(configRouter);
router.use(positionsRouter);
router.use(tradesRouter);
router.use(tokensRouter);
router.use(dashboardRouter);

export default router;
