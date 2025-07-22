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
  if (!email) {
    return res.status(400).json({ error: "Customer email is required." });
  }
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

app.post("/send-gift-inquiry", async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  try {
    // ✅ Send email to Tassel
    await transporter.sendMail({
      from: `"Tassel Gifts" <${process.env.SMTP_USER}>`,
      to: process.env.ORDER_RECEIVER,
      subject: "New Tassel Gift Inquiry",
      text: `Gift Inquiry from ${name}\n\nEmail: ${email}\nPhone: ${phone}\nMessage:\n${message}`,
    });

    // ✅ Confirmation to customer
    await transporter.sendMail({
      from: `"Tassel Gifts" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Tassel Gift Inquiry Confirmation",
      text: `Hi ${name},\n\nThank you for reaching out about Tassel Beauty's gift options! We will contact you soon.\n\nYour message:\n${message}\n\nRegards,\nTassel Beauty Team`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Gift Inquiry Error:", err);
    res.status(500).json({ error: "Failed to send inquiry" });
  }
});


app.post("/send-massage-booking", async (req, res) => {
  const { name, email, phone, service, date, time } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  try {
    // ✅ Send booking notification to Tassel Beauty
    await transporter.sendMail({
      from: `"Tassel Massage Bookings" <${process.env.SMTP_USER}>`,
      to: process.env.ORDER_RECEIVER,
      subject: "New Massage Booking Request",
      text: `
New Massage Booking:

Name: ${name}
Email: ${email}
Phone: ${phone}

Service: ${service}
Date: ${date}
Time: ${time}
      `,
    });

    // ✅ Confirmation to customer
    await transporter.sendMail({
      from: `"Tassel Massage Bookings" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Tassel Massage Booking Request",
      text: `
Hi ${name},

Thank you for booking with Tassel Beauty & Wellness Studio!

Booking details:
Service: ${service}
Date: ${date}
Time: ${time}

We'll confirm availability and get back to you shortly.

Warm regards,
Tassel Beauty Team
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Massage Booking Error:", err);
    res.status(500).json({ error: "Failed to send booking request" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Email server running on ${PORT}`));