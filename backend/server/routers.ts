import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { CREDENTIAL_COOKIE_NAME, createCredentialToken, hashPassword, verifyPassword } from "./credentialAuth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { addCredentialPassword, createCredentialUser, getCredentialUserByEmail, recordCredentialSignIn } from "./db";

const credentialsInput = z.object({
  email: z.string().email().max(320).transform(value => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
});

const publicProfile = (user: { id: number; name: string | null; email: string | null; role: string; accountStatus: string }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  accountStatus: user.accountStatus,
});

export function canAttachCredentialPassword(
  existingUser: { id: number; passwordHash: string | null } | undefined,
  authenticatedUser: { id: number } | null,
) {
  return Boolean(existingUser && !existingUser.passwordHash && authenticatedUser?.id === existingUser.id);
}

async function setCredentialCookie(ctx: { req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => unknown } }, user: { id: number; credentialSessionVersion: number }) {
  const token = await createCredentialToken({ userId: user.id, sessionVersion: user.credentialSessionVersion });
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(CREDENTIAL_COOKIE_NAME, token, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? publicProfile(opts.ctx.user) : null),
    register: publicProcedure.input(z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().email().max(320),
      password: z.string().min(8).max(128),
      role: z.enum(["quality-engineer", "factory-supervisor"]),
    })).mutation(async ({ ctx, input }) => {
      const email = input.email.trim().toLowerCase();
      const existing = await getCredentialUserByEmail(email);
      const passwordHash = await hashPassword(input.password);

      if (existing) {
        if (canAttachCredentialPassword(existing, ctx.user)) {
          const user = await addCredentialPassword(existing.id, passwordHash);
          await setCredentialCookie(ctx, user);
          return { user: publicProfile(user) };
        }

        const message = existing.passwordHash
          ? "An account with this email already exists. Log in instead."
          : "This email is already linked to an existing sign-in method. Sign in with that method first, then add a password.";
        throw new TRPCError({ code: "CONFLICT", message });
      }

      const user = await createCredentialUser({
        openId: `cred_${nanoid(21)}`,
        name: input.name,
        email,
        passwordHash,
        role: input.role === "quality-engineer" ? "quality_engineer" : "factory_supervisor",
      });
      await setCredentialCookie(ctx, user);
      return { user: publicProfile(user) };
    }),
    login: publicProcedure.input(credentialsInput).mutation(async ({ ctx, input }) => {
      const user = await getCredentialUserByEmail(input.email);
      const invalidCredentials = () => new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
      const passwordMatches = user?.passwordHash ? await verifyPassword(input.password, user.passwordHash) : false;
      if (!user || !passwordMatches) throw invalidCredentials();
      if (user.accountStatus !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Your account is disabled. Contact your administrator." });

      await recordCredentialSignIn(user.id);
      await setCredentialCookie(ctx, user);
      return { user: publicProfile(user) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(CREDENTIAL_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
