import { profile, user } from '@db/schema';
import { db } from '@db/setup';
import { eq, and } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import { sendBapEvent } from '@lib/bap-event';

const UpdateProfileForDialFlowSchema = z.object({
  userId: z.string(),
  profileId: z.uuid(),
  metadata: z.record(z.string(), z.any()).optional(),
});

type UpdateProfileForDialFlowInput = z.infer<
  typeof UpdateProfileForDialFlowSchema
>;

function deepMerge(
  target: Record<string, any>,
  source: Record<string, any>
): Record<string, any> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

const updateProfile = async (
  request: FastifyRequest<{ Body: UpdateProfileForDialFlowInput }>,
  reply: FastifyReply
) => {
  const { userId, profileId, metadata } = request.body;

  const userDetails = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  if (!userDetails) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_USER_ID',
      error: 'Bad Request',
      message: 'User Id entered is not valid',
    });
  }

  const [existing] = await db
    .select()
    .from(profile)
    .where(and(eq(profile.id, profileId), eq(profile.userId, userDetails.id)))
    .limit(1);

  if (!existing) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'PROFILE_NOT_FOUND',
      error: 'Not Found',
      message: 'Profile not found',
    });
  }

  const mergedMetadata = metadata
    ? deepMerge(existing.metadata as Record<string, any>, metadata)
    : existing.metadata;

  await db
    .update(profile)
    .set({
      metadata: mergedMetadata,
      updatedAt: new Date(),
    })
    .where(eq(profile.id, profileId));

  sendBapEvent('profile.updated', {
    userId: userDetails.id,
    profileId,
  }).catch((err) => {
    request.log.error({ err }, 'BAP event failed');
  });

  return reply.status(200).send({
    statusCode: 200,
    message: 'Profile updated successfully',
    data: {
      profileId,
    },
  });
};

export default updateProfile;
