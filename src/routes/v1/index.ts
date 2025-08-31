import { FastifyPluginAsync } from 'fastify';
import storageBucket from './gcp/buckets';
import userProfile from './profile';
import location from './profile/location';
import contact from './profile/contact';
import adminRoutes from './admin';
import dialFlowRoutes from './dialFlow';

const v1Routes: FastifyPluginAsync = async (fastify) => {
  fastify.register(adminRoutes, { prefix: '/admin' });
  fastify.register(userProfile, { prefix: '/profile' });
  fastify.register(location, { prefix: '/location' });
  fastify.register(contact, { prefix: '/contact' });
  fastify.register(storageBucket, { prefix: '/storage' });
  fastify.register(dialFlowRoutes, { prefix: '/dial-flow' });
};

export default v1Routes;
