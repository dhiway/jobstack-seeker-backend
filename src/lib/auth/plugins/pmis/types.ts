import { User } from 'better-auth';

export interface PMISPluginOptions {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;

  /**
   * FRONTEND redirect after login
   */
  successRedirect: string;

  /**
   * Optional override
   */
  scope?: string;

  /**
   * Optional cookie domain
   */
  cookieDomain?: string;
}

export interface PMISUser {
  candidate_id: number;
  candidate_name: string;
  mobile: string;
  email: string;
}

export interface UserWithPhoneNumber extends User {
  phoneNumber: string;
  phoneNumberVerified: boolean;
  dateOfBirth?: string;
  isMinor?: boolean;
  termsAccepted: boolean | null;
  privacyAccepted: boolean | null;
}
