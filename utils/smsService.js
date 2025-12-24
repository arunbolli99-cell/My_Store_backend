const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPViaSMS = async (toNumber, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    console.error("❌ FAST2SMS API key is missing from environment variables");
    throw new Error("FAST2SMS API key missing from environment");
  }

  if (!toNumber || typeof toNumber !== 'string') {
    console.error("❌ Invalid phone number format:", toNumber);
    throw new Error("Invalid phone number format");
  }

  console.log(`📱 Sending OTP to phone number: ${toNumber}`);

  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "q",
        numbers: toNumber,
        message: `Your MY STORE OTP is ${otp}. Valid for 5 minutes. Do not share this with anyone.`
      })
    });

    if (!response.ok) {
      console.error(`❌ Fast2SMS API error: HTTP ${response.status}`);
      throw new Error(`Fast2SMS HTTP error: ${response.status}`);
    }

    const data = await response.json();
    console.log("📞 Fast2SMS API Response:", JSON.stringify(data));

    if (!data || data.return === false) {
      console.error("❌ Fast2SMS rejected request:", data?.message || "Unknown error");
      throw new Error(data?.message || "Fast2SMS API rejected the request");
    }

    console.log(`✅ OTP sent successfully to ${toNumber}`);
    return true;
  } catch (error) {
    console.error("❌ SMS sending failed:", error.message);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

module.exports = {
  generateOTP,
  sendOTPViaSMS
};
