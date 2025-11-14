import { pgEnum } from 'drizzle-orm/pg-core';

export const ConsentType = pgEnum('consent_type', [
  'profile',
  'account',
  'other',
]);

export * from './auth';
export * from './job';
export * from './commons';
export * from './consent';
