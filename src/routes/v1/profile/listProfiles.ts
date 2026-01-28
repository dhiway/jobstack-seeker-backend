import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { FastifyRequest, FastifyReply } from 'fastify';
import z from 'zod/v4';
import { profile, location, profileLocation } from '@db/schema/commons';
import { db } from '@db/setup';
import { ProfilePaginationQuerySchema } from '@validation/common';

type ListProfileQuery = z.infer<typeof ProfilePaginationQuerySchema>;

export async function listProfiles(
  request: FastifyRequest<{ Querystring: ListProfileQuery }>,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const { page, limit, type, sortBy, sortOrder } =
    ProfilePaginationQuerySchema.parse(request.query);

  const sortColumn =
    sortBy === 'updatedAt' ? profile.updatedAt : profile.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const where = [eq(profile.userId, userId)];
  if (type) where.push(eq(profile.type, type));

  const profiles = await db
    .select()
    .from(profile)
    .where(and(...where))
    .offset((page - 1) * limit)
    .limit(limit)
    .orderBy(orderBy);

  const [{ count }] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(profile)
    .where(and(...where));

  const totalCount = Number(count);

  return reply.send({
    statusCode: 200,
    message: 'Profiles fetched successfully',
    data: profiles,
    pagination: {
      totalCount,
      page,
      limit,
    },
  });
}
export async function listAllProfiles(
  request: FastifyRequest<{ Querystring: ListProfileQuery }>,
  reply: FastifyReply
) {
  const { page, limit, type, sortBy, sortOrder } =
    ProfilePaginationQuerySchema.parse(request.query);

  const sortColumn =
    sortBy === 'updatedAt' ? profile.updatedAt : profile.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const whereConditions = [];
  if (type) {
    whereConditions.push(eq(profile.type, type));
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  const profiles = await db
    .select({
      profile: {
        id: profile.id,
        userId: profile.userId,
        type: profile.type,
        metadata: profile.metadata,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      location: {
        id: location.id,
        tag: location.tag,
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        pincode: location.pincode,
        gps: location.gps,
      },
    })
    .from(profile)
    .leftJoin(profileLocation, eq(profileLocation.profileId, profile.id))
    .leftJoin(location, eq(location.id, profileLocation.locationId))
    .where(whereClause)
    .orderBy(orderBy)
    .offset((page - 1) * limit)
    .limit(limit);



  const [{ count }] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(profile)
    .where(whereClause);

  const totalCount = Number(count);

  return reply.send({
    statusCode: 200,
    message: 'All profiles fetched successfully',
    data: profiles.map(row => ({
      ...row.profile,
      metadata: {
        ...(row.profile.metadata ?? {}),
        location: row.location ?? null,
      },
    })),
    pagination: {
      totalCount,
      page,
      limit,
    },
  });

}
