import { authMiddleware } from '@middleware/validateSession';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createGuardianRecord } from './createGuardianRecord';
import { verifyGuardianRecord } from './verifyGuardianConsent';

const consentRoutesProvider: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/guardian/create',
    method: 'POST',
    preHandler: authMiddleware,
    handler: createGuardianRecord,
  });
  fastify.route({
    url: '/guardian/verify',
    method: 'PUT',
    preHandler: authMiddleware,
    handler: verifyGuardianRecord,
  });
};

export default consentRoutesProvider;
