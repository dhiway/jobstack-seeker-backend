import { guardianConsent } from '@db/schema';

export const guardianConsentEmailOtpHtmlTemplate = (
  otp: string,
  guardian: typeof guardianConsent.$inferSelect | null
) => `
  <div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">
    <p>Hi, <span style="text-transform: capitalize;">${guardian?.guardianName.toLowerCase() || 'user'}</span></p>

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

export const guardianConsentApplicationOtpHtmlTemplate = (
  otp: string,
  guardian: typeof guardianConsent.$inferSelect | null
) => `
  <div style="font-family: Arial, sans-serif; font-size: 15px; color: #333;">
    <p>Hi, <span style="text-transform: capitalize;">${guardian?.guardianName.toLowerCase() || 'user'}</span></p>

    <p> By sharing the given OTP, I consent to share the profile of my ward with the selected Job Provider per the Terms and Policies of ONEST - Team EkStep:</p>

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
