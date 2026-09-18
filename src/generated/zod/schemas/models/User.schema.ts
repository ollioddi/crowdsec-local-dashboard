import * as z from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  username: z.string().nullish(),
  displayUsername: z.string().nullish(),
});

export type UserType = z.infer<typeof UserSchema>;
