import AddressModel from "../models/address.model";
import { CreateAddressInput, UpdateAddressInput } from "../validators/address.validator";
import { NotFoundException } from "../utils/app-error";

export const createAddressService = async (
  userId: string,
  data: CreateAddressInput
) => {
  await AddressModel.updateMany(
    { userId, isDefault: true },
    { $set: { isDefault: false } }
  );

  const address = await AddressModel.create({
    ...data,
    userId,
    isDefault: true,
  });
  return address;
};

export const getUserAddressesService = async (userId: string) => {
  const addresses = await AddressModel.find({ userId }).sort({
    isDefault: -1,
    createdAt: -1,
  });
  return { addresses };
};

export const updateAddressService = async (
  userId: string,
  addressId: string,
  data: UpdateAddressInput
) => {
  const address = await AddressModel.findOne({ _id: addressId, userId });
  if (!address) throw new NotFoundException("Address not found");

  if (data.isDefault === true) {
    await AddressModel.updateMany(
      { userId, isDefault: true },
      { $set: { isDefault: false } }
    );
  }

  Object.assign(address, data);
  await address.save();
  return address;
};

export const deleteAddressService = async (
  userId: string,
  addressId: string
) => {
  const address = await AddressModel.findOneAndDelete({ _id: addressId, userId });
  if (!address) throw new NotFoundException("Address not found");

  if (address.isDefault) {
    const latestAddress = await AddressModel.findOne({ userId }).sort({
      createdAt: -1,
    });
    if (latestAddress) {
      latestAddress.isDefault = true;
      await latestAddress.save();
    }
  }

  return { message: "Address deleted successfully" };
};
