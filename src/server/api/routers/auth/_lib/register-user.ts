import bcrypt from "bcrypt";
import { db } from "~/server/db";

export default async function registerUser(
  name: string,
  email: string,
  password: string,
) {
  if (await db.user.findUnique({ where: { email } })) {
    throw new Error("учетная запись с таким email уже существует");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Сохраните пользователя в БД
  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  return user;
}
