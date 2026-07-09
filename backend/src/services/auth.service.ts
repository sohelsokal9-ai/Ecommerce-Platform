import getSupabaseClient from "../config/supabase.config";
import { BadRequestException, UnauthorizedException } from "../utils/app-error";
import { RegisterInput, LoginInput } from "../validators/auth.validator";
import { mergeGuestCartService } from "./cart.service";
import { hashValue, compareValue } from "../utils/bcrypt.util";
import { mapRow } from "../utils/map.util";

export const registerService = async (data: RegisterInput) => {
  const supabase = getSupabaseClient();

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", data.email)
    .single();

  if (existingUser) {
    throw new BadRequestException("Email already in use");
  }

  const hashedPassword = await hashValue(data.password);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone || null,
      avatar: data.avatar || null,
    })
    .select("id, name, email, role, phone, avatar, created_at, updated_at")
    .single();

  if (error) throw new BadRequestException(error.message);
  return mapRow(user) as any;
};

export const loginService = async ({ email, password }: LoginInput) => {
  const supabase = getSupabaseClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    throw new UnauthorizedException("Invalid email or password");
  }

  const isMatch = await compareValue(password, user.password);
  if (!isMatch) {
    throw new UnauthorizedException("Invalid email or password");
  }

  const { password: _, ...safeUser } = user;
  return mapRow(safeUser) as any;
};

export const registerAndMergeGuestCart = async (
  data: RegisterInput,
  guestCartId: string | null
) => {
  const user = await registerService(data);
  await mergeGuestCartService(user.id, guestCartId);
  return user;
};

export const loginAndMergeGuestCart = async (
  email: string,
  password: string,
  guestCartId: string | null
) => {
  const user = await loginService({ email, password });
  await mergeGuestCartService(user.id, guestCartId);
  return user;
};
