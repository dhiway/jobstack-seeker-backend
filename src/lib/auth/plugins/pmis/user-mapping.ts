import { PMISUser } from './types';

export function mapPMISToUser(user: PMISUser) {
  return {
    email: user.email,
    name: user.candidate_name,
    phoneNumber: user.mobile,
    phoneNumberVerified: true,
    termsAccepted: true,
    privacyAccepted: true,
  };
}
