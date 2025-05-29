import express from "express";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-order", async (req, res) => {
  await createOrder(req, res);
});
router.post("/verify", verifyPayment);

export default router;
