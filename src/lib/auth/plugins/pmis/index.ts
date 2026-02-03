import { BetterAuthPlugin } from 'better-auth';
import { PMISPluginOptions } from './types';
import { PMISClient } from './pmis-client';
import { createAuthEndpoint } from 'better-auth/api';
import { mapPMISToUser } from './user-mapping';
import { setSessionCookie } from '../utils';

export const pmisPlugin = (options: PMISPluginOptions): BetterAuthPlugin => {
  const client = new PMISClient(options);
  const callbackPath = options.callbackPath ?? 'v1/auth/oauth2/callback/pmis';

  return {
    id: 'pmis',
    endpoints: {
      authorization: createAuthEndpoint(
        '/sign-in/oauth2',
        {
          method: 'POST',
        },
        async (ctx) => {
          const state = crypto.randomUUID();
          const redirectUri =
            ctx.body!.redirect_uri ?? `${ctx.context.baseURL}${callbackPath}`;

          const url = new URL(options.authorizationUrl);

          url.searchParams.set('client_id', options.clientId);
          url.searchParams.set('redirect_uri', redirectUri);
          url.searchParams.set('scope', options.scope ?? 'read');
          url.searchParams.set('state', state);

          return ctx.redirect(url.toString());
        }
      ),
      callback: createAuthEndpoint(
        '/oauth2/callback/pmis',
        { method: 'GET' },
        async (ctx) => {
          const code = ctx.query!.authorization_code as string;

          if (!code) {
            throw new Error('authorization_code missing');
          }

          //-----------------------------------
          // Exchange Token
          //-----------------------------------

          const token = await client.exchangeCode(code);

          //-----------------------------------
          // Fetch User
          //-----------------------------------

          const pmisUser = await client.getUser(token.access_token);

          //-----------------------------------
          // Find or Create User
          //-----------------------------------
          const existing = await ctx.context.internalAdapter.findUserByEmail(
            pmisUser.email
          );

          let user;

          if (!existing) {
            const userData = mapPMISToUser(pmisUser);
            let res = await ctx.context.internalAdapter.createUser(userData);
            user = res;
          } else {
            user = existing.user;
          }

          const session = await ctx.context.internalAdapter.createSession(
            user.id,
            false
          );

          await setSessionCookie(
            ctx,
            {
              session: session as any,
              user,
            },
            false
          );

          return ctx.redirect(options.successRedirect ?? '/dashboard');
        }
      ),
    },
  };
};
