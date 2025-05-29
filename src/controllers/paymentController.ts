import { Request, Response } from "express";
import razorpay from "../config/razorpay.js";


export const createOrder = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const options = {
      amount: amount * 100,    
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    res.status(201).json(order);
  } catch (error) {
    console.error("Order creation failed", error);
    res.status(500).json({ error: "Order creation failed" });
  }
};

export const verifyPayment = (req: Request, res: Response) => {
  const crypto = require("crypto");

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_order_id + "|" + razorpay_payment_id)
    .digest("hex");

  if (generated_signature === razorpay_signature) {
    res.json({ message: "Payment verified successfully" });
  } else {
    res.status(400).json({ error: "Invalid signature, payment verification failed" });
  }
};
