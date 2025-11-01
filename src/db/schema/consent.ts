import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { jobPosting } from './job';

export const guardianConsent = pgTable('guardian_consent', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  userEmail: text('user_email').unique(),
  userPhone: text('user_phone').unique(),

  guardianName: text('guardian_name').notNull(),
  guardianEmail: text('guardian_email').notNull(),
  guardianPhone: text('guardian_phone'),

  termsAccepted: boolean('terms_accepted').default(false),
  privacyAccepted: boolean('privacy_accepted').default(false),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// implement in unified otp
export const userConsent = pgTable('user_consent', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  termsAccepted: boolean('terms_accepted').default(false),
  privacyAccepted: boolean('privacy_accepted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const applicationConsent = pgTable('application_consent', {
  id: uuid('id').primaryKey().defaultRandom(),
  seekerId: text('seeker_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  jobPostId: uuid('job_post_id')
    .references(() => jobPosting.id, { onDelete: 'cascade' })
    .notNull(),
  // for minors, store guardian consent
  guardianConsentId: uuid('guardian_consent_id').references(
    () => guardianConsent.id
  ),
  // for adults
  seekerConsentGiven: boolean('seeker_consent_given'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* export const providerDataExportConsent = pgTable(
  'provider_data_export_consent',
  {
    id: uuid('id').primaryKey(),
    providerId: text('provider_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    jobPostId: uuid('job_post_id')
      .references(() => jobPosting.id, { onDelete: 'cascade' })
      .notNull(),

    consentGiven: boolean('consent_given').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),

    termsAccepted: boolean('terms_accepted').default(false),
    privacyAccepted: boolean('privacy_accepted').default(false),
  }
); */
