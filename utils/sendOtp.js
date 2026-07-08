const axios = require('axios');

const otpStore = new Map(); // phone -> { otp, expiresAt, attempts }
const OTP_TTL_MS = 3 * 60 * 1000; // 3 minutes (matches SMS text)
const MAX_ATTEMPTS = 5;


const sendSms = async (phone, otp) => {
  // Clean text — no leading space, no chennaiepc suffix
  const text = `BULL RISE OTP: ${otp} is your OTP for mobile number verification. Valid for 3 min. BULL RISE.`;

  const params = {
    user: process.env.SMS_USER,
    password: process.env.SMS_PASSWORD,
    senderid: process.env.SMS_SENDER_ID,
    channel: 'Trans',
    DCS: 0,
    flashsms: 0,
    number: `91${phone}`,
    text,
    route: 6,
    templateid: process.env.SMS_TEMPLATE_ID,
    peid: '1001293340000013187', // DLT Entity ID from your dashboard
  };

  const { data } = await axios.get(
    'https://online.chennaisms.com/api/mt/SendSMS',
    { params }
  );

  console.log('SMS gateway response:', JSON.stringify(data));
  return data;
};


const generateOtp = async (phone) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const data = await sendSms(phone, otp); // send FIRST

  if (data?.ErrorCode !== '000') {
    console.error('SMS send failed:', JSON.stringify(data));
    throw new Error('Failed to send OTP. Please try again.');
  }

  // store ONLY after successful send
  otpStore.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  return true;
};


const verifyOtp = (phone, otp) => {
  const record = otpStore.get(phone);
  if (!record) return false;

  if (record.expiresAt < Date.now()) {
    otpStore.delete(phone);
    return false;
  }

  record.attempts += 1;
  if (record.attempts > MAX_ATTEMPTS) {
    otpStore.delete(phone);
    return false;
  }

  const valid = record.otp === otp;
  if (valid) otpStore.delete(phone); // single-use
  return valid;
};

module.exports = { generateOtp, verifyOtp };