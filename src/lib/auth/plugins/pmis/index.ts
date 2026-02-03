import { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { PMISClient } from './pmis-client';
import { mapPMISToUser } from './user-mapping';
import { setSessionCookie } from '../utils';
import { PMISPluginOptions } from './types';

const CALLBACK_PATH = '/api/v1/auth/oauth2/callback/pmis';
const STATE_COOKIE = 'pmis_oauth_state';

export const pmisPlugin = (options: PMISPluginOptions): BetterAuthPlugin => {
  const client = new PMISClient(options);

  return {
    id: 'pmis',

    endpoints: {
      /* Generate authorization URL */
      authorization: createAuthEndpoint(
        '/sign-in/oauth2/pmis',
        { method: 'POST' },
        async (ctx) => {
          const state = crypto.randomUUID();

          const callbackUrl = `${ctx.context.baseURL}${CALLBACK_PATH}`;

          // Store state cookie
          ctx.setCookie(STATE_COOKIE, state, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            domain: options.cookieDomain,
            path: '/',
          });

          const url = new URL(options.authorizationUrl);

          url.searchParams.set('response_type', 'code');
          url.searchParams.set('client_id', options.clientId);
          url.searchParams.set('redirect_uri', callbackUrl);
          url.searchParams.set('scope', options.scope ?? 'read');
          url.searchParams.set('state', state);

          return { url: url.toString(), redirect: true };
        }
      ),
      /* OAuth callback */
      callback: createAuthEndpoint(
        CALLBACK_PATH,
        { method: 'GET' },
        async (ctx) => {
          const { authorization_code, state } = ctx.query as {
            authorization_code?: string;
            state?: string;
          };

          if (!authorization_code) {
            throw new Error('authorization_code missing');
          }

          // Validate state
          const storedState = ctx.getCookie(STATE_COOKIE);

          if (!storedState || storedState !== state) {
            throw new Error('Invalid OAuth state');
          }

          // delete cookie after validation
          ctx.setCookie(STATE_COOKIE, '', {
            maxAge: 0,
            path: '/',
          });

          // Exchange Token
          const token = await client.exchangeCode(authorization_code);

          // Fetch PMIS user
          const pmisUser = await client.getUser(token.access_token);

          // Provider linking

          const providerId = String(pmisUser.candidate_id);

          let account =
            await ctx.context.internalAdapter.findAccount(providerId);

          let user;

          if (!account) {
            // create user
            user = await ctx.context.internalAdapter.createUser(
              mapPMISToUser(pmisUser)
            );

            // link provider
            await ctx.context.internalAdapter.linkAccount({
              userId: user.id,
              providerId: 'pmis',
              accountId: providerId,
            });
          } else {
            user = await ctx.context.internalAdapter.findUserById(
              account.userId
            );
          }

          //-----------------------------------
          // Create session
          //-----------------------------------
          if (!user)
            throw new APIError('INTERNAL_SERVER_ERROR', {
              message: 'User not found',
            });

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
            false
          );
          await setSessionCookie(
            ctx,
            {
              session: session as any,
              user: user,
            },
            false
          );

          // FINAL redirect → FRONTEND
          return ctx.redirect(options.successRedirect);
        }
      ),
    },
  };
};
