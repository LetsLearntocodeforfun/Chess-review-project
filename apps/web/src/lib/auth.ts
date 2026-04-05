import { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    {
      id: "lichess",
      name: "Lichess",
      type: "oauth",
      authorization: {
        url: "https://lichess.org/oauth",
        params: {
          scope: "preference:read",
          response_type: "code",
        },
      },
      token: {
        url: "https://lichess.org/api/token",
      },
      userinfo: {
        url: "https://lichess.org/api/account",
      },
      clientId: process.env.LICHESS_CLIENT_ID,
      clientSecret: process.env.LICHESS_CLIENT_SECRET || "unused",
      checks: ["state"],
      profile(profile: any) {
        return {
          id: profile.id,
          name: profile.username,
          email: profile.email || null,
          image: null,
        };
      },
    },
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).lichessId = (user as any).lichessId;
        (session.user as any).chesscomUser = (user as any).chesscomUser;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "lichess" && profile) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lichessId: (profile as any).id || (profile as any).username },
          });
        } catch {
          // First sign-in: adapter creates user, we update on next session
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "database",
  },
};
