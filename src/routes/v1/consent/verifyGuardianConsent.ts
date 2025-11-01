import { guardianConsent } from '@db/schema';
import { db } from '@db/setup';
import redis from '@lib/redis';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

interface VerifyGuardianConsentBody {
  id: string;
  otp: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export async function verifyGuardianRecord(
  request: FastifyRequest<{ Body: VerifyGuardianConsentBody }>,
  reply: FastifyReply
) {
  try {
    const { id, otp, termsAccepted, privacyAccepted } = request.body;

    const storedOtp = await redis.get(`guardian_otp:${id}`);
    if (!storedOtp) {
      return reply
        .code(400)
        .send({ success: false, message: 'OTP expired or not found' });
    }

    if (storedOtp !== otp) {
      return reply.code(400).send({ success: false, message: 'Invalid OTP' });
    }

    const [updated] = await db
      .update(guardianConsent)
      .set({
        termsAccepted,
        privacyAccepted,
        updatedAt: new Date(),
      })
      .where(eq(guardianConsent.id, id))
      .returning();

    await redis.del(`guardian_otp:${id}`);

    return reply.code(200).send({
      success: true,
      consent: updated,
    });
  } catch (err) {
    console.error(err);
    return reply
      .code(500)
      .send({ success: false, message: 'Failed to verify consent' });
  }
}
