import { IUser } from "../models/user.model";

declare global {
  namespace Express {
    interface User extends Omit<IUser, "password"> {}

    interface Request {
      guestCartId?: string | null;
    }
  }
}
