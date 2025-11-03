import { authMiddleware } from '@middleware/validateSession';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createGuardianRecord } from './createGuardianRecord';
import { verifyGuardianRecord } from './verifyGuardianConsent';
import { fetchGuardianRecord } from './fetchGuardianDetails';
import { createUserConsentRecord } from './createUserConsentRecord';

const consentRoutesProvider: FastifyPluginAsyncZod = async function (fastify) {
  //guardian
  fastify.route({
    url: '/guardian/create',
    method: 'POST',
    handler: createGuardianRecord,
  });
  fastify.route({
    url: '/guardian/verify',
    method: 'PUT',
    handler: verifyGuardianRecord,
  });
  fastify.route({
    url: '/guardian',
    method: 'GET',
    preHandler: authMiddleware,
    handler: fetchGuardianRecord,
  });
  //user
  fastify.route({
    url: '/user/create',
    method: 'POST',
    preHandler: authMiddleware,
    handler: createUserConsentRecord,
  });
  /* fastify.route({
    url: '/guardian/verify',
    method: 'PUT',
    preHandler: authMiddleware,
    handler: verifyGuardianRecord,
  }); */
};

export default consentRoutesProvider;
