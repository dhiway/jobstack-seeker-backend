import { guardianConsent } from '@db/schema';
import { db } from '@db/setup';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

export async function fetchGuardianRecord(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  const guardian = await db.query.guardianConsent.findFirst({
    where: eq(guardianConsent.userId, user.id),
  });

  if (!guardian) {
    reply.status(500).send({ status: false, message: 'No guardian found' });
  }

  reply.send({
    status: true,
    guardian,
  });
}
