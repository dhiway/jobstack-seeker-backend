import { pgEnum } from 'drizzle-orm/pg-core';

export const profileType = pgEnum('profile_type', ['personal', 'client']);
export const jobStatusEnum = pgEnum('job_status', [
  'draft',
  'open',
  'closed',
  'archived',
]);
export const ConsentType = pgEnum('consent_type', [
  'profile',
  'account',
  'other',
]);
