import { USER_ROLE_VALUES, USER_ROLES, UserRole } from "../constants/enums";

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string | null;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export type IUserSafe = Omit<IUser, "password">;
