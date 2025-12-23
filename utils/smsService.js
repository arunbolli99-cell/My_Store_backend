const fast2sms = require('fast2sms');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPViaSMS = async (phoneNumber, otp) => {
    try {
        const apiKey = process.env.FAST2SMS_API_KEY;

        if (!apiKey) {
            console.error('FAST2SMS_API_KEY not configured');
            throw new Error('SMS service not configured');
        }

        const message = `Your MY STORE OTP is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;

        const response = await fast2sms.sendMessage({
            authorization: apiKey,
            message: message,
            numbers: [phoneNumber]
        });

        return {
            success: true,
            messageId: response.request_id,
            status: response.return
        };
    } catch (error) {
        console.error('SMS sending failed:', error);
        throw new Error(`Failed to send OTP: ${error.message}`);
    }
};

module.exports = {
    generateOTP,
    sendOTPViaSMS
};
