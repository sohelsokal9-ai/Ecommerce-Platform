import getSupabaseClient from "../config/supabase.config";
import { CreateAddressInput, UpdateAddressInput } from "../validators/address.validator";
import { NotFoundException } from "../utils/app-error";
import { mapRow, mapRows } from "../utils/map.util";

export const createAddressService = async (
  userId: string,
  data: CreateAddressInput
) => {
  const supabase = getSupabaseClient();

  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);

  const { data: address, error } = await supabase
    .from("addresses")
    .insert({
      user_id: userId,
      recipient_name: data.recipientName,
      phone: data.phone,
      street: data.street,
      city: data.city,
      state: data.state,
      postal_code: data.postalCode,
      country: data.country,
      is_default: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(address);
};

export const getUserAddressesService = async (userId: string) => {
  const supabase = getSupabaseClient();

  const { data: addresses, error } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return { addresses: mapRows(addresses || []) };
};

export const updateAddressService = async (
  userId: string,
  addressId: string,
  data: UpdateAddressInput
) => {
  const supabase = getSupabaseClient();

  const { data: existingData } = await supabase
    .from("addresses")
    .select("id")
    .eq("id", addressId)
    .eq("user_id", userId)
    .single();

  const existing = existingData ? mapRow(existingData) : null;

  if (!existing) throw new NotFoundException("Address not found");

  if (data.isDefault === true) {
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.recipientName !== undefined) updateData.recipient_name = data.recipientName;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.street !== undefined) updateData.street = data.street;
  if (data.city !== undefined) updateData.city = data.city;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.postalCode !== undefined) updateData.postal_code = data.postalCode;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

  const { data: address, error } = await supabase
    .from("addresses")
    .update(updateData)
    .eq("id", addressId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(address);
};

export const deleteAddressService = async (
  userId: string,
  addressId: string
) => {
  const supabase = getSupabaseClient();

  const { data: existingData } = await supabase
    .from("addresses")
    .select("id, is_default")
    .eq("id", addressId)
    .eq("user_id", userId)
    .single();

  const existing = existingData ? mapRow(existingData) : null;

  if (!existing) throw new NotFoundException("Address not found");

  await supabase.from("addresses").delete().eq("id", addressId);

  if (existing.isDefault) {
    const { data: latestData } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const latest = latestData ? mapRow(latestData) : null;

    if (latest) {
      await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", latest._id);
    }
  }

  return { message: "Address deleted successfully" };
};
