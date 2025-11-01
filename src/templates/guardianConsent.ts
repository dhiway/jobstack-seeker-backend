import { UserWithPhoneNumber } from 'better-auth/plugins';

export const emailOtpHtmlTemplate = (
  otp: string,
  user: UserWithPhoneNumber | null
) => `
  <div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">
    <p>Hi, <span style="text-transform: capitalize;">${user?.name.toLowerCase() || 'user'}</span></p>

    <p>Your ward has requested for registration on ONEST. Use the given OTP to agree to create their account - Team EkStep:</p>

    <div style="
      font-size: 20px;
      font-weight: bold;
      background-color: #f4f4f4;
      padding: 10px 15px;
      border-radius: 6px;
      display: inline-block;
      font-family: 'Courier New', monospace;
      margin: 10px 0;
    ">
      ${otp}
    </div>

    <p style="font-size: 13px; color: #555;">This OTP is valid for a 5 minutes. Do not share it with anyone.</p>
  </div>
`;
