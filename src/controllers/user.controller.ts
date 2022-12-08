import type { RouterContext } from "../deps.ts";
import { User } from "../models/user.model.ts";

const getMeController = async ({ state, response }: RouterContext<string>) => {
  try {
    const user = await User.findOne({ _id: state.user_id });

    if (!user) {
      response.status = 401;
      response.body = {
        status: "fail",
        message: "The user belonging to this token no longer exists",
      };
      return;
    }
    response.status = 200;
    response.body = {
      status: "success",
      user,
    };
  } catch (error) {
    response.status = 500;
    response.body = {
      status: "error",
      message: error.message,
    };
    return;
  }
};

export default { getMeController };
