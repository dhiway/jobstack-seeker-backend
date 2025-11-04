import { minorJobApplicationConsent } from '@db/schema';
import { db } from '@db/setup';
import redis from '@lib/redis';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

interface verifyMinorApplicationBody {
  id: string;
  otp: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}
export async function verifyMinorApplicationConsent(
  request: FastifyRequest<{ Body: verifyMinorApplicationBody }>,
  reply: FastifyReply
) {
  const { id, otp, termsAccepted, privacyAccepted } = request.body;

  const storedOtp = await redis.get(`minor_ja_otp:${id}`);
  if (!storedOtp) {
    return reply
      .code(400)
      .send({ success: false, message: 'OTP expired or not found' });
  }

  if (storedOtp !== otp) {
    return reply.code(400).send({ success: false, message: 'Invalid OTP' });
  }

  const [updated] = await db
    .update(minorJobApplicationConsent)
    .set({
      termsAccepted,
      privacyAccepted,
      updatedAt: new Date(),
    })
    .where(eq(minorJobApplicationConsent.id, id))
    .returning();

  await redis.del(`guardian_otp:${id}`);

  return reply.code(200).send({
    success: true,
    consent: updated,
  });
}
