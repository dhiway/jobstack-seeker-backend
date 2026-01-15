import 'better-auth';

declare module 'better-auth' {
  interface BetterAuthUser {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null | undefined;
    dateOfBirth?: string; // stored as ISO date or YYYY-MM-DD
    isMinor?: boolean; // computed at runtime
    phoneNumber?: string | null;
    phoneNumberVerified?: boolean | null;
  }
  interface User {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null | undefined;
    dateOfBirth?: string; // stored as ISO date or YYYY-MM-DD
    isMinor?: boolean; // computed at runtime
    phoneNumber?: string | null;
    phoneNumberVerified?: boolean | null;
  }
}
