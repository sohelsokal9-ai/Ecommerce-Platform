import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import {
  createAddressSchema,
  updateAddressSchema,
  addressParamsSchema,
} from "../validators/address.validator";
import {
  createAddressService,
  getUserAddressesService,
  updateAddressService,
  deleteAddressService,
} from "../services/address.service";

export const createAddressController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const data = createAddressSchema.parse(req.body);
    const address = await createAddressService(userId, data);

    res.status(HTTPSTATUS.CREATED).json({
      message: "Address created successfully",
      address,
    });
  }
);

export const getUserAddressesController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const result = await getUserAddressesService(userId);

    res.status(HTTPSTATUS.OK).json({
      message: "Addresses retrieved successfully",
      ...result,
    });
  }
);

export const updateAddressController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const { addressId } = addressParamsSchema.parse(req.params);
    const data = updateAddressSchema.parse(req.body);
    const address = await updateAddressService(userId, addressId, data);

    res.status(HTTPSTATUS.OK).json({
      message: "Address updated successfully",
      address,
    });
  }
);

export const deleteAddressController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!._id.toString();
    const { addressId } = addressParamsSchema.parse(req.params);
    const result = await deleteAddressService(userId, addressId);

    res.status(HTTPSTATUS.OK).json(result);
  }
);
