import {
  guardianConsent,
  minorJobApplicationConsent,
  profile,
} from '@db/schema';
import { db } from '@db/setup';
import { generateOtp } from '@lib/auth/plugins/unifiedOtp';
import { sendMail } from '@lib/mailer';
import { sendSmsWithMsg91 } from '@lib/messager';
import redis from '@lib/redis';
import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

interface CreateMinorApplicationConsentBody {
  profileId: string;
  guardianId: string;
}

export async function createMinorApplicationConsent(
  request: FastifyRequest<{ Body: CreateMinorApplicationConsentBody }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { profileId, guardianId } = request.body;
  const otp = generateOtp();
  const expiresInSec = 5 * 60;

  const existingProfile = await db.query.profile.findFirst({
    where: and(eq(profile.id, profileId), eq(profile.userId, userId)),
  });

  console.log('profile: ', profileId, userId, profile.id);

  if (!existingProfile) {
    return reply.status(404).send({
      status: false,
      message: 'profile not found',
    });
  }

  const guardian = await db.query.guardianConsent.findFirst({
    where: and(
      eq(guardianConsent.id, guardianId),
      eq(guardianConsent.userId, userId)
    ),
  });

  if (!guardian) {
    return reply.status(404).send({
      status: false,
      message: 'guardian not found',
    });
  }

  const [consent] = await db
    .insert(minorJobApplicationConsent)
    .values({
      guardianId,
      userId,
      profileId,
      termsAccepted: false,
      privacyAccepted: false,
    })
    .returning();

  if (!consent) {
    return reply.status(500).send({
      status: false,
      message: 'Failed to initiate minor consent',
    });
  }

  await redis.setex(`minor_ja_otp:${consent.id}`, expiresInSec, otp);

  if (guardian.guardianEmail)
    await sendMail({
      fromName: 'Jobstack seeker',
      fromEmail: '',
      to: guardian.guardianEmail,
      subject: 'Your One-Time Password (OTP) for Jobstack seeker',
      html: `<p>otp: ${otp}</p>`,
    });
  if (guardian.guardianPhone)
    await sendSmsWithMsg91({
      phoneNumber: guardian.guardianPhone,
      message: otp,
    });

  reply.send({
    status: true,
    consent,
  });
}
