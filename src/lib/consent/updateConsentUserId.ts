import { guardianConsent } from '@db/schema';
import { db } from '@db/setup';
import { UserWithPhoneNumber } from 'better-auth/plugins';
import { eq, or } from 'drizzle-orm';

export async function updateUserGuardianConsent(
  user: UserWithPhoneNumber
): Promise<{
  updated: boolean;
  consentId: string | null;
}> {
  const existingConsent = await db.query.guardianConsent.findFirst({
    where: or(
      eq(guardianConsent.userPhone, user.phoneNumber),
      eq(guardianConsent.userEmail, user.email)
    ),
  });

  if (!existingConsent) {
    return {
      updated: false,
      consentId: null,
    };
  }
  if (typeof existingConsent.userId !== 'string') {
    const [updatedConsent] = await db
      .update(guardianConsent)
      .set({
        userId: user.id,
        updatedAt: new Date(),
      })
      .where(eq(guardianConsent.id, existingConsent.id))
      .returning();
    if (!updatedConsent) {
      return {
        updated: false,
        consentId: existingConsent.id,
      };
    }

    return {
      updated: true,
      consentId: existingConsent.id,
    };
  } else {
    return {
      updated: true,
      consentId: existingConsent.id,
    };
  }
}
