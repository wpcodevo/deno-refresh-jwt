import { ObjectId, RouterContext } from "../deps.ts";
import { Bson } from "../deps.ts";
import { User } from "../models/user.model.ts";
import { signJwt, verifyJwt } from "../utils/jwt.ts";
import redisClient from "../utils/connectRedis.ts";

const ACCESS_TOKEN_EXPIRES_IN = 15;
const REFRESH_TOKEN_EXPIRES_IN = 60;

const signUpUserController = async ({
  request,
  response,
}: RouterContext<string>) => {
  try {
    const {
      name,
      email,
      password,
    }: { name: string; email: string; password: string } = await request.body()
      .value;

    const createdAt = new Date();
    const updatedAt = createdAt;

    const userId: string | Bson.ObjectId = await User.insertOne({
      name,
      email: email.toLowerCase(),
      password,
      createdAt,
      updatedAt,
    });

    if (!userId) {
      response.status = 500;
      response.body = { status: "error", message: "Error creating user" };
      return;
    }

    const user = await User.findOne({ _id: userId });

    response.status = 201;
    response.body = {
      status: "success",
      user,
    };
  } catch (error) {
    if ((error.message as string).includes("E11000")) {
      response.status = 409;
      response.body = {
        status: "fail",
        message: "A user with that email already exists",
      };
      return;
    }
    response.status = 500;
    response.body = { status: "error", message: error.message };
    return;
  }
};

const loginUserController = async ({
  request,
  response,
  cookies,
}: RouterContext<string>) => {
  try {
    const { email, password: _password }: { email: string; password: string } =
      await request.body().value;

    const message = "Invalid email or password";
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (!userExists) {
      response.status = 401;
      response.body = {
        status: "fail",
        message,
      };
      return;
    }

    const accessTokenExpiresIn = new Date(
      Date.now() + ACCESS_TOKEN_EXPIRES_IN * 60 * 1000
    );
    const refreshTokenExpiresIn = new Date(
      Date.now() + REFRESH_TOKEN_EXPIRES_IN * 60 * 1000
    );

    const { token: access_token, token_uuid: access_uuid } = await signJwt({
      user_id: String(userExists._id),
      token_uuid: crypto.randomUUID(),
      base64PrivateKeyPem: "ACCESS_TOKEN_PRIVATE_KEY",
      expiresIn: accessTokenExpiresIn,
      issuer: "website.com",
    });
    const { token: refresh_token, token_uuid: refresh_uuid } = await signJwt({
      user_id: String(userExists._id),
      token_uuid: crypto.randomUUID(),
      base64PrivateKeyPem: "REFRESH_TOKEN_PRIVATE_KEY",
      expiresIn: refreshTokenExpiresIn,
      issuer: "website.com",
    });

    await Promise.all([
      redisClient.set(access_uuid, String(userExists._id), {
        ex: ACCESS_TOKEN_EXPIRES_IN * 60,
      }),
      redisClient.set(refresh_uuid, String(userExists._id), {
        ex: REFRESH_TOKEN_EXPIRES_IN * 60,
      }),
    ]);

    cookies.set("access_token", access_token, {
      expires: accessTokenExpiresIn,
      maxAge: ACCESS_TOKEN_EXPIRES_IN * 60,
      httpOnly: true,
      secure: false,
    });
    cookies.set("refresh_token", refresh_token, {
      expires: refreshTokenExpiresIn,
      maxAge: REFRESH_TOKEN_EXPIRES_IN * 60,
      httpOnly: true,
      secure: false,
    });

    response.status = 200;
    response.body = { status: "success", access_token };
  } catch (error) {
    response.status = 500;
    response.body = { status: "error", message: error.message };
    return;
  }
};

const refreshAccessTokenController = async ({
  response,
  cookies,
}: RouterContext<string>) => {
  try {
    const refresh_token = await cookies.get("refresh_token");

    const message = "Could not refresh access token";

    if (!refresh_token) {
      response.status = 403;
      response.body = {
        status: "fail",
        message,
      };
      return;
    }

    const decoded = await verifyJwt<{ sub: string; token_uuid: string }>({
      token: refresh_token,
      base64PublicKeyPem: "REFRESH_TOKEN_PUBLIC_KEY",
    });

    if (!decoded) {
      response.status = 403;
      response.body = {
        status: "fail",
        message,
      };
      return;
    }

    const user_id = await redisClient.get(decoded.token_uuid);

    if (!user_id) {
      response.status = 403;
      response.body = {
        status: "fail",
        message,
      };
      return;
    }

    const user = await User.findOne({ _id: new ObjectId(user_id) });

    if (!user) {
      response.status = 403;
      response.body = {
        status: "fail",
        message,
      };
      return;
    }

    const accessTokenExpiresIn = new Date(
      Date.now() + ACCESS_TOKEN_EXPIRES_IN * 60 * 1000
    );

    const { token: access_token, token_uuid: access_uuid } = await signJwt({
      user_id: decoded.sub,
      issuer: "website.com",
      token_uuid: crypto.randomUUID(),
      base64PrivateKeyPem: "ACCESS_TOKEN_PRIVATE_KEY",
      expiresIn: accessTokenExpiresIn,
    });

    await redisClient.set(access_uuid, String(user._id), {
      ex: ACCESS_TOKEN_EXPIRES_IN * 60,
    });

    cookies.set("access_token", access_token, {
      expires: accessTokenExpiresIn,
      maxAge: ACCESS_TOKEN_EXPIRES_IN * 60,
      httpOnly: true,
      secure: false,
    });

    response.status = 200;
    response.body = { status: "success", access_token };
  } catch (error) {
    response.status = 500;
    response.body = { status: "error", message: error.message };
    return;
  }
};

const logoutController = async ({
  state,
  response,
  cookies,
}: RouterContext<string>) => {
  try {
    const refresh_token = await cookies.get("refresh_token");

    const message = "Token is invalid or session has expired";

    if (!refresh_token) {
      response.status = 403;
      response.body = {
        status: "fail",
        message,
      };
      return;
    }

    const decoded = await verifyJwt<{ sub: string; token_uuid: string }>({
      token: refresh_token,
      base64PublicKeyPem: "REFRESH_TOKEN_PUBLIC_KEY",
    });

    if (!decoded) {
      response.status = 403;
      response.body = {
        status: "fail",
        message,
      };
      return;
    }

    await redisClient.del(decoded?.token_uuid, state.access_uuid);

    cookies.set("access_token", "", {
      httpOnly: true,
      secure: false,
      maxAge: -1,
    });
    cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: false,
      maxAge: -1,
    });

    response.status = 200;
    response.body = { status: "success" };
  } catch (error) {
    response.status = 500;
    response.body = { status: "error", message: error.message };
  }
};
export default {
  signUpUserController,
  loginUserController,
  logoutController,
  refreshAccessTokenController,
};
