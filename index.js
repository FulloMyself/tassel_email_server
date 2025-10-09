const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { vouchers } = require("./vouchers");


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
  const { items, total, email, deliveryOption, deliveryDetails } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Customer email is required." });
  }

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No items in order." });
  }

  try {
    // 1️⃣ Format items nicely
    const itemsText = items
      .map((i) => {
        const itemPrice =
          i.salePrice && i.salePrice > 0 && i.salePrice < i.price
            ? i.salePrice
            : i.price;
        return `${i.name} x${i.quantity} (R${(itemPrice * i.quantity).toFixed(
          2
        )})`;
      })
      .join("\n");

    // 2️⃣ Delivery info
    let deliveryText = "";
    if (deliveryOption === "delivery" && deliveryDetails) {
      deliveryText = `\n\nDelivery Details:\nName: ${deliveryDetails.name}\nPhone: ${deliveryDetails.phone}\nEmail: ${deliveryDetails.email}\nAddress: ${deliveryDetails.address}`;
    } else {
      deliveryText = "\n\nCustomer will collect order in-store.";
    }

    // 3️⃣ Email to business
    await transporter.sendMail({
      from: `"Tassel Shop" <${process.env.SMTP_USER}>`,
      to: process.env.ORDER_RECEIVER,
      subject: "🛍️ New Tassel Shop Order",
      text: `New order received from: ${email}\n\nItems:\n${itemsText}\n\nTotal: R${Number(
        total
      ).toFixed(2)}${deliveryText}`,
    });

    // 4️⃣ Confirmation to customer
    await transporter.sendMail({
      from: `"Tassel Shop" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🪷 Your Tassel Shop Order Confirmation",
      text: `Thank you for your order!\n\nOrder details:\n${itemsText}\n\nTotal: R${Number(
        total
      ).toFixed(2)}${deliveryText}\n\nWe'll be in touch soon to confirm collection or delivery.\n\nWith love,\nTassel Beauty 🌸`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Send order error:", err);
    res.status(500).json({ error: "Failed to send email." });
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

// ✅ Secure Voucher Validation Endpoint
app.post("/api/validate-voucher", (req, res) => {
  const { code } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ valid: false, message: "Invalid request." });
  }

  // Find active voucher
  const voucher = vouchers.find(
    (v) => v.code.toUpperCase() === code.toUpperCase() && v.active
  );

  if (!voucher) {
    return res.status(404).json({ valid: false, message: "Invalid or expired code." });
  }

  // Only send safe voucher info (no need to expose backend logic)
  return res.json({
    valid: true,
    voucher: {
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      description: voucher.description,
    },
  });
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Email server running on ${PORT}`));