import { FastifyPluginAsync } from 'fastify';
import { createOrganizationExternal } from './createOrganization';

const externalRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.route({
    url: '/organizations',
    method: 'POST',
    handler: createOrganizationExternal,
  });
};

export default externalRoutes;
