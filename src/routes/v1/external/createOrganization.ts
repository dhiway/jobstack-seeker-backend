import { member, organization, user } from '@db/schema/auth';
import { db } from '@db/setup';
import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

const CreateOrganizationExternalRequestSchema = z
  .object({
    ownerName: z.string().min(1),
    ownerEmail: z.email().optional(),
    ownerPhoneNumber: z.string().min(8).optional(),
    ownerRole: z.string().default('owner'),
    organizationName: z.string().min(1),
    orgSlug: z.string().optional(),
    organizationType: z.string().default('employer'),
    logo: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine((data) => Boolean(data.ownerEmail || data.ownerPhoneNumber), {
    message: 'Either ownerEmail or ownerPhoneNumber is required',
    path: ['ownerEmail'],
  });

type CreateOrganizationExternalRequestInput = z.infer<
  typeof CreateOrganizationExternalRequestSchema
>;

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function findUserByIdentity(ownerEmail?: string, ownerPhoneNumber?: string) {
  let existingByEmail: typeof user.$inferSelect | undefined;
  let existingByPhone: typeof user.$inferSelect | undefined;

  if (ownerEmail) {
    existingByEmail = await db.query.user.findFirst({
      where: eq(user.email, ownerEmail),
    });
  }

  if (ownerPhoneNumber) {
    existingByPhone = await db.query.user.findFirst({
      where: eq(user.phoneNumber, ownerPhoneNumber),
    });
  }

  if (
    existingByEmail &&
    existingByPhone &&
    existingByEmail.id !== existingByPhone.id
  ) {
    return { conflict: true as const };
  }

  return {
    conflict: false as const,
    existingUser: existingByEmail ?? existingByPhone,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const possibleCode = (error as { code?: string }).code;
  return possibleCode === '23505';
}

export async function createOrganizationExternal(
  request: FastifyRequest<{ Body: CreateOrganizationExternalRequestInput }>,
  reply: FastifyReply
) {
  const apiKey = request.headers['x-api-key'];
  const expectedApiKey = process.env.EXTERNAL_ORG_CREATE_API_KEY;

  if (!expectedApiKey) {
    return reply.status(500).send({
      statusCode: 500,
      code: 'MISSING_EXTERNAL_API_KEY_CONFIG',
      error: 'Internal Server Error',
      message: 'EXTERNAL_ORG_CREATE_API_KEY is not configured',
    });
  }

  if (typeof apiKey !== 'string' || apiKey !== expectedApiKey) {
    return reply.status(403).send({
      statusCode: 403,
      code: 'INVALID_API_KEY',
      error: 'Forbidden',
      message: 'Invalid API key provided',
    });
  }

  const parsed = CreateOrganizationExternalRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'BAD_REQUEST',
      error: 'Bad Request',
      message: parsed.error.flatten().fieldErrors,
    });
  }

  const {
    ownerName,
    ownerEmail,
    ownerPhoneNumber,
    ownerRole,
    organizationName,
    orgSlug,
    organizationType,
    logo,
    metadata,
  } = parsed.data;

  const identityLookup = await findUserByIdentity(ownerEmail, ownerPhoneNumber);

  if (identityLookup.conflict) {
    return reply.status(409).send({
      statusCode: 409,
      code: 'USER_IDENTITY_CONFLICT',
      error: 'Conflict',
      message: 'Provided ownerEmail and ownerPhoneNumber belong to different users',
    });
  }

  let ownerUser = identityLookup.existingUser;

  let chosenSlug = orgSlug ? normalizeSlug(orgSlug) : normalizeSlug(organizationName);

  if (!chosenSlug) {
    return reply.status(400).send({
      statusCode: 400,
      code: 'INVALID_ORG_SLUG',
      error: 'Bad Request',
      message: 'Generated or provided orgSlug is invalid',
    });
  }

  if (orgSlug) {
    const existingOrg = await db.query.organization.findFirst({
      where: eq(organization.slug, chosenSlug),
    });

    if (existingOrg) {
      return reply.status(409).send({
        statusCode: 409,
        code: 'ORG_SLUG_ALREADY_EXISTS',
        error: 'Conflict',
        message: `Organization slug '${chosenSlug}' already exists`,
      });
    }
  } else {
    let suffix = 0;
    let availableSlug = chosenSlug;
    const maxAttempts = 100;
    while (suffix < maxAttempts) {
      const existingOrg = await db.query.organization.findFirst({
        where: eq(organization.slug, availableSlug),
      });

      if (!existingOrg) {
        chosenSlug = availableSlug;
        break;
      }

      suffix += 1;
      availableSlug = `${chosenSlug}-${suffix}`;
    }

    if (suffix >= maxAttempts) {
      return reply.status(500).send({
        statusCode: 500,
        code: 'SLUG_GENERATION_FAILED',
        error: 'Internal Server Error',
        message: 'Failed to generate unique organization slug',
      });
    }
  }

  // Note: The following metadata keys are reserved and will be overwritten:
  // - contactPersonName
  // - contactEmail
  // - contactPhone
  // These are always set from the owner information provided in the request.
  const metadataPayload = {
    ...metadata,
    contactPersonName: ownerName,
    contactEmail: ownerEmail ?? '',
    contactPhone: ownerPhoneNumber ?? '',
  };

  const effectiveRole = ownerRole || 'owner';
  let createdOrg: typeof organization.$inferSelect | undefined;
  let finalOwnerUser: typeof user.$inferSelect;
  let finalIsExistingUser = false;

  try {
    await db.transaction(async (tx) => {
      // Create or update user within transaction
      if (!ownerUser) {
        const insertedUsers = await tx
          .insert(user)
          .values({
            id: crypto.randomUUID(),
            name: ownerName,
            email: ownerEmail,
            phoneNumber: ownerPhoneNumber,
            emailVerified: Boolean(ownerEmail),
            phoneNumberVerified: Boolean(ownerPhoneNumber),
            role: 'seeker',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        finalOwnerUser = insertedUsers[0];
        finalIsExistingUser = false;
      } else {
        await tx
          .update(user)
          .set({
            name: ownerName || ownerUser.name,
            email: ownerEmail || ownerUser.email,
            phoneNumber: ownerPhoneNumber || ownerUser.phoneNumber,
            emailVerified: ownerEmail ? true : ownerUser.emailVerified,
            phoneNumberVerified: ownerPhoneNumber
              ? true
              : ownerUser.phoneNumberVerified,
            updatedAt: new Date(),
          })
          .where(eq(user.id, ownerUser.id));

        finalOwnerUser = ownerUser;
        finalIsExistingUser = true;
      }

      // Create organization with retry for race conditions
      const baseSlug = chosenSlug;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const insertedOrgs = await tx
            .insert(organization)
            .values({
              id: crypto.randomUUID(),
              name: organizationName,
              slug: chosenSlug,
              logo,
              type: organizationType,
              metadata: JSON.stringify(metadataPayload),
              createdAt: new Date(),
            })
            .returning();

          createdOrg = insertedOrgs[0];
          break;
        } catch (error) {
          if (!isUniqueViolation(error)) {
            throw error;
          }

          if (orgSlug) {
            throw new Error('ORG_SLUG_ALREADY_EXISTS');
          }

          const retrySlug = `${baseSlug}-${attempt + 1}`;
          chosenSlug = retrySlug;
        }
      }

      if (!createdOrg) {
        throw new Error('ORG_CREATE_FAILED');
      }

      // Create membership
      const existingMembership = await tx.query.member.findFirst({
        where: and(
          eq(member.userId, finalOwnerUser.id),
          eq(member.organizationId, createdOrg.id)
        ),
      });

      if (!existingMembership) {
        await tx.insert(member).values({
          id: crypto.randomUUID(),
          userId: finalOwnerUser.id,
          organizationId: createdOrg.id,
          role: effectiveRole,
          createdAt: new Date(),
        });
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ORG_SLUG_ALREADY_EXISTS') {
        return reply.status(409).send({
          statusCode: 409,
          code: 'ORG_SLUG_ALREADY_EXISTS',
          error: 'Conflict',
          message: `Organization slug '${chosenSlug}' already exists`,
        });
      }
      if (error.message === 'ORG_CREATE_FAILED') {
        return reply.status(500).send({
          statusCode: 500,
          code: 'ORG_CREATE_FAILED',
          error: 'Internal Server Error',
          message: 'Failed to create organization after retries',
        });
      }
    }
    throw error;
  }

  if (!createdOrg || !finalOwnerUser!) {
    return reply.status(500).send({
      statusCode: 500,
      code: 'TRANSACTION_FAILED',
      error: 'Internal Server Error',
      message: 'Failed to complete organization creation',
    });
  }

  const appBaseUrl =
    process.env.SEEKER_APP_BASE_URL?.replace(/\/+$/, '') ||
    'https://getjob.onest.network';

  return reply.status(201).send({
    statusCode: 201,
    message: 'Organization created and linked successfully',
    data: {
      organization: {
        id: createdOrg.id,
        name: createdOrg.name,
        slug: createdOrg.slug,
      },
      owner: {
        id: finalOwnerUser.id,
        name: finalOwnerUser.name,
        email: finalOwnerUser.email,
        phoneNumber: finalOwnerUser.phoneNumber,
        role: effectiveRole,
        existingUser: finalIsExistingUser,
      },
      url: `${appBaseUrl}/${createdOrg.slug}/seeker`,
    },
  });
}
