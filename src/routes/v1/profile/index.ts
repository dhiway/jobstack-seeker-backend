import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  ErrorResponseSchema,
  SuccessResponseSchema,
} from '@validation/schema/response';
import { authMiddleware } from '@middleware/validateSession';
import { validateAPIKey } from '@middleware/validateAPIKey';
import { createUserProfile } from './createProfile';
import {
  CreateUserProfileResponseSchema,
  CreateUserProfileSchema,
  FetchUserProfilesResponseSchema,
  ProfilePaginationQuerySchema,
  UpdateProfileSchema,
} from '@validation/common';
import { updateProfile } from './updateProfile';
import { deleteProfile } from './deleteProfile';
import { listProfiles, listAllProfiles } from './listProfiles';

const userProfile: FastifyPluginAsyncZod = async function (fastify) {
  fastify.route({
    url: '/',
    method: 'GET',
    schema: {
      querystring: ProfilePaginationQuerySchema,
      tags: ['Profile'],
      response: {
        200: FetchUserProfilesResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: listProfiles,
  });
  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      body: CreateUserProfileSchema,
      tags: ['Profile'],
      response: {
        201: CreateUserProfileResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: createUserProfile,
  });
  fastify.route({
    url: '/',
    method: 'PUT',
    schema: {
      body: UpdateProfileSchema,
      tags: ['Profile'],
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: updateProfile,
  });
  fastify.route({
    url: '/',
    method: 'DELETE',
    schema: {
      body: UpdateProfileSchema,
      tags: ['Profile'],
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: authMiddleware,
    handler: deleteProfile,
  });
  fastify.route({
    url: '/all',
    method: 'GET',
    schema: {
      querystring: ProfilePaginationQuerySchema,
      tags: ['Profile'],
      response: {
        200: FetchUserProfilesResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
      },
    },
    preHandler: async (request, reply) => {
      validateAPIKey(request, reply);
    },
    handler: listAllProfiles,
  });

};

export default userProfile;
