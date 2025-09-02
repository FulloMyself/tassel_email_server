const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://fullomyself.github.io",
    "https://tasselgroup.co.za"
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
  const { forWhom, services, selectedTime, email } = req.body;

  if (!email || !services || services.length === 0) {
    return res.status(400).json({ error: "All booking details are required." });
  }

  try {
    const serviceList = services
      .map((s) => `${s.name} (R${s.price}) - ${s.duration} mins`)
      .join("\n");

    // ✅ Email to Tassel
    await transporter.sendMail({
      from: `"Tassel Bookings" <${process.env.SMTP_USER}>`,
      to: process.env.ORDER_RECEIVER,
      subject: "New Massage Booking Request",
      text: `Booking from: ${email}

For: ${forWhom === "others" ? "Myself & others" : "Just myself"}
Selected Time: ${selectedTime || "Not selected yet"}

Services:
${serviceList}

Please confirm with the customer as soon as possible.`,
    });

    // ✅ Confirmation email to customer
    await transporter.sendMail({
      from: `"Tassel Beauty & Wellness" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Tassel Beauty Massage Booking Confirmation",
      text: `Hi ${email.split("@")[0]},

Thank you for booking with Tassel Beauty & Wellness Studio!

Booking details:
${services
  .map((s) => `• ${s.name} (${s.duration} mins) - R${s.price}`)
  .join("\n")}
Time: ${selectedTime || "We'll confirm your time shortly"}

We'll confirm availability and get back to you shortly.

Warm regards,
Tassel Beauty Team
`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Booking email failed:", err);
    res.status(500).json({ error: "Failed to send booking email." });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Email server running on ${PORT}`));