const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://fullomyself.github.io"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

app.post("/send-order", async (req, res) => {
  const { items, total, email } = req.body;
  try {
    // 1. Send order notification to business
    await transporter.sendMail({
      from: `"Tassel Shop" <${process.env.SMTP_USER}>`,
      to: process.env.ORDER_RECEIVER,
      subject: "New Tassel Shop Order",
      text: `Order from: ${email}\n\nItems:\n${items
        .map((i) => `${i.name} x${i.quantity} (R${i.price})`)
        .join("\n")}\n\nTotal: R${total}`,
    });

    // 2. Send confirmation to customer
    await transporter.sendMail({
      from: `"Tassel Shop" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Tassel Shop Order Confirmation",
      text: `Thank you for your order!\n\nOrder details:\n${items
        .map((i) => `${i.name} x${i.quantity} (R${i.price})`)
        .join("\n")}\n\nTotal: R${total}\n\nWe'll be in touch soon!`,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Email server running on ${PORT}`));