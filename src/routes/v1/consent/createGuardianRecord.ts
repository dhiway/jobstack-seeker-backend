import { guardianConsent } from '@db/schema';
import { db } from '@db/setup';
import { generateOtp } from '@lib/auth/plugins/unifiedOtp';
import { sendMail } from '@lib/mailer';
import { sendSmsWithMsg91 } from '@lib/messager';
import redis from '@lib/redis';
import { guardianConsentEmailOtpHtmlTemplate } from '@src/templates/guardianConsent';
import { eq, or } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

interface CreateGuardianConsentBody {
  userEmail: string;
  userPhone: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone?: string;
}

export async function createGuardianRecord(
  request: FastifyRequest<{ Body: CreateGuardianConsentBody }>,
  reply: FastifyReply
) {
  try {
    const { userEmail, userPhone, guardianName, guardianEmail, guardianPhone } =
      request.body;

    const userId = request.user?.id;
    const otp = generateOtp();
    const expiresInSec = 5 * 60;
    let consent;

    const guardianExists = await db.query.guardianConsent.findFirst({
      where: or(
        eq(guardianConsent.userPhone, userPhone),
        eq(guardianConsent.userEmail, userEmail)
      ),
    });

    if (!guardianExists) {
      const [newConsent] = await db
        .insert(guardianConsent)
        .values({
          userId,
          userEmail,
          userPhone,
          guardianName,
          guardianEmail,
          guardianPhone,
        })
        .returning();
      consent = newConsent;
    } else {
      consent = guardianExists;
    }

    if (!consent) {
      return reply
        .code(500)
        .send({ success: false, message: 'Failed to create consent' });
    }

    await redis.setex(`guardian_otp:${consent.id}`, expiresInSec, otp);

    if (guardianEmail)
      await sendMail({
        fromName: 'Jobstack seeker',
        fromEmail: '',
        to: guardianEmail,
        subject: 'Your One-Time Password (OTP) for Jobstack seeker',
        html: guardianConsentEmailOtpHtmlTemplate(otp, consent),
      });
    if (guardianPhone)
      await sendSmsWithMsg91({ phoneNumber: guardianPhone, message: otp });

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
