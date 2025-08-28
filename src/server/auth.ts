import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcrypt";
import {
  getServerSession,
  type DefaultSession,
  type NextAuthOptions,
} from "next-auth";
import { type Adapter } from "next-auth/adapters";
// import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";

import { env } from "~/env";
import { db } from "~/server/db";
import { User } from "~/types/user";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user?: User;
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
  callbacks: {
    session: ({ session, token }) => {
      return {
        ...session,
        user: token.user as User | undefined,
      };
    },
    async jwt({ token }) {
      if (token.sub) {
        let data = await db.user.findFirst({
          where: {
            id: token.sub,
          },
          include: {
            Group: true,
            Favourites: {
              include: {
                Group: true,
                Teacher: true,
                Classroom: true,
              },
            },
          },
        });

        if (data) {
          // @ts-ignore
          delete data.password;

          token = { ...token, user: data };
        }
      }

      return token;
    },
  },
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const { email, password } = credentials;

        // Найдите пользователя в базе данных
        const user = await db.user.findUnique({
          where: { email },
        });

        // Если пользователь найден и пароли совпадают
        if (user && (await compare(password, user.password))) {
          return {
            name: user.name,
            email: user.email,
            id: user.id,
          }; // Вернуть данные пользователя, если авторизация успешна
        }

        // Если авторизация не удалась, вернуть null
        return null;
      },
    }),
  ],
  jwt: {
    maxAge: 60 * 60 * 24 * 512,
  },
  session: {
    strategy: "jwt",
  },
};

/**
 * Wrapper for `getServerSession` so that you don't need to import the `authOptions` in every file.
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => getServerSession(authOptions);
