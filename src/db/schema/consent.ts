import { pgTable, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { jobPosting } from './job';
import { profile } from './commons';
import { ConsentType } from './enums';

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

export const minorJobApplicationConsent = pgTable(
  'minor_job_application_consent',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id').references(() => profile.id, {
      onDelete: 'cascade',
    }),
    guardianId: uuid('guardian_id').references(() => guardianConsent.id),
    termsAccepted: boolean('terms_accepted').default(false),
    privacyAccepted: boolean('privacy_accepted').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  }
);

export const userConsent = pgTable('user_consent', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  entityId: uuid('entity_id'),
  consentType: ConsentType('consent_type').default('other'),
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
