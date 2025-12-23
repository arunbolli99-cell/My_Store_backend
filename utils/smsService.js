// utils/smsService.js

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPViaSMS = async (phoneNumber, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    throw new Error("FAST2SMS API key missing");
  }

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      "authorization": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      route: "otp",
      numbers: phoneNumber,
      message: `Your MY STORE OTP is ${otp}. Valid for 5 minutes.`
    })
  });

  const data = await response.json();

  if (!data || data.return !== true) {
    throw new Error(data?.message || "FAST2SMS failed");
  }

  return true;
};

module.exports = {
  generateOTP,
  sendOTPViaSMS
};
