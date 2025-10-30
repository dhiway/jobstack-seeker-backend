import { member, user } from '@db/schema/auth';
import { db } from '@db/setup';
import { sendWhatsAppMessage } from '@lib/whatsapp-messager';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod/v4';

export const VerifyUserExistsRequestSchema = z.object({
  name: z.string().optional().default('user'),
  phoneNumber: z.string(),
  role: z.enum(['seeker', 'member', 'viewer', 'admin']).default('seeker'),
  orgId: z.string().length(32).or(z.uuid()).optional(),
});

type VerifyUserExistsRequestInput = z.infer<
  typeof VerifyUserExistsRequestSchema
>;
const verifyUser = async (
  request: FastifyRequest<{ Body: VerifyUserExistsRequestInput }>,
  reply: FastifyReply
) => {
  const { phoneNumber, name, role, orgId } = request.body;

  let userDetails = await db.query.user.findFirst({
    where: eq(user.phoneNumber, phoneNumber),
  });

  if (!userDetails) {
    const createdUser = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        phoneNumber,
        name: name || 'user',
        role: 'seeker',
        phoneNumberVerified: true,
      })
      .returning();

    userDetails = createdUser[0];

    // ✅ only add to member if orgId is present
    if (orgId && z.uuid().safeParse(orgId).success) {
      await db.insert(member).values({
        id: crypto.randomUUID(),
        role,
        userId: userDetails.id,
        createdAt: new Date(),
        organizationId: orgId,
      });
    }
  }

  if (process.env.SEND_WHATSAPP_NOTIFICATION === 'true') {
    try {
      await sendWhatsAppMessage(
        phoneNumber,
        process.env.TWILIO_CONTENT_SID_DIALFLOW_SEEKER!
      );
    } catch (err) {
      console.error('Whatsapp message failed', err);
    }
  }
  reply.status(200).send({
    statusCode: 200,
    message: 'User Details Fetched',
    data: {
      user: userDetails,
    },
  });
};
export default verifyUser;
