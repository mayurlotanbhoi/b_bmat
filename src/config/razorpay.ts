import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
console.log("Razorpay API keys:", RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay API keys missing in environment variables.");
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export default razorpay;
