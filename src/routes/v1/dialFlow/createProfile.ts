import { profile, user } from '@db/schema';
import { db } from '@db/setup';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';
import { sendBapEvent } from '@lib/bap-event';

const CreateProfileForDialFlowRequestSchema = z.object({
  userId: z.string(),
  metadata: z.record(z.string(), z.any()),
});

type CreateProfileForDialFlowInput = z.infer<
  typeof CreateProfileForDialFlowRequestSchema
>;
const createProfile = async (
  request: FastifyRequest<{ Body: CreateProfileForDialFlowInput }>,
  reply: FastifyReply
) => {
  const { userId, metadata } = request.body;
  const userDetails = await db.query.user.findFirst({
    where: eq(user.id, userId),
  });

  if (!userDetails) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'Invalid User Id',
      error: 'Bad Request',
      message: 'User Id entered is not valid',
    });
  }

  const newProfile = await db
    .insert(profile)
    .values({
      userId: userDetails.id,
      type: 'personal',
      metadata,
    })
    .returning();

  sendBapEvent('profile.created', {
    userId: userDetails.id,
    profileId: newProfile[0].id,
  }).catch((err) => {
    request.log.error({ err }, 'BAP event failed');
  });

  return reply.status(201).send({
    statusCode: 201,
    message: 'Profile Created Successfully',
    data: {
      profileId: newProfile[0].id,
    },
  });
};

export default createProfile;
