import NextAuth, { type NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // Lichess OAuth2 (PKCE)
    {
      id: "lichess",
      name: "Lichess",
      type: "oauth",
      authorization: {
        url: "https://lichess.org/oauth",
        params: {
          scope: "preference:read challenge:read",
          response_type: "code",
        },
      },
      token: "https://lichess.org/api/token",
      userinfo: "https://lichess.org/api/account",
      clientId: process.env.LICHESS_CLIENT_ID,
      clientSecret: process.env.LICHESS_CLIENT_SECRET || "",
      profile(profile) {
        return {
          id: profile.id,
          name: profile.username,
          email: null,
          image: null,
          lichessId: profile.id,
        };
      },
    },
    // Chess.com — public API doesn't require OAuth for game export.
    // We store the username via the profile page and use the public API.
    // If Chess.com adds OAuth support, add the provider here.
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
        // Update lichessId on sign in
        await prisma.user.update({
          where: { id: user.id },
          data: { lichessId: (profile as any).id },
        }).catch(() => {
          // User may not exist yet (first sign in), adapter handles creation
        });
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
