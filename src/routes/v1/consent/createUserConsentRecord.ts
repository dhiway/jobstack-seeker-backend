import { userConsent } from '@db/schema';
import { db } from '@db/setup';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

interface CreateUserConsentBody {
  entityId: string;
  consentType: 'profile' | 'account' | 'other';
}

export async function createUserConsentRecord(
  request: FastifyRequest<{ Body: CreateUserConsentBody }>,
  reply: FastifyReply
) {
  try {
    const { entityId, consentType } = request.body;

    const userId = request.user.id;
    let consent;

    const consentRequestExists = await db.query.userConsent.findFirst({
      where: eq(userConsent.entityId, entityId),
    });

    if (!consentRequestExists) {
      const [newConsent] = await db
        .insert(userConsent)
        .values({
          userId,
          entityId,
          termsAccepted: true,
          privacyAccepted: true,
          consentType: consentType || 'other',
        })
        .returning();
      consent = newConsent;
    } else if (
      !consentRequestExists.termsAccepted ||
      !consentRequestExists.privacyAccepted
    ) {
      const [newConsent] = await db
        .update(userConsent)
        .set({
          userId,
          entityId,
          termsAccepted: true,
          privacyAccepted: true,
        })
        .returning();
      consent = newConsent;
    } else {
      consent = consentRequestExists;
    }

    if (!consent) {
      return reply
        .code(500)
        .send({ success: false, message: 'Failed to create consent' });
    }

    return reply.code(201).send({
      success: true,
      consent,
    });
  } catch (err) {
    console.error(err);
    return reply
      .code(500)
      .send({ success: false, message: 'Failed to create consent' });
  }
}
