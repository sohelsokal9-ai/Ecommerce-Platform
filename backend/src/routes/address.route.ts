import { Router } from "express";
import {
  createAddressController,
  getUserAddressesController,
  updateAddressController,
  deleteAddressController,
} from "../controllers/address.controller";
import { passportAuthenticateJwt } from "../config/passport.config";

const addressRoutes = Router();
addressRoutes.use(passportAuthenticateJwt);
addressRoutes.post("/", createAddressController);
addressRoutes.get("/", getUserAddressesController);
addressRoutes.put("/:addressId", updateAddressController);
addressRoutes.delete("/:addressId", deleteAddressController);

export default addressRoutes;
