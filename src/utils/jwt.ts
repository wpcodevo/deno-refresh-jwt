import { getNumericDate, create, verify, dotenvConfig } from "../deps.ts";
import type { Payload, Header } from "../deps.ts";
import { convertToCryptoKey } from "./convertCryptoKey.ts";
dotenvConfig({ export: true, path: ".env" });

export const signJwt = async ({
  user_id,
  token_uuid,
  issuer,
  base64PrivateKeyPem,
  expiresIn,
}: {
  user_id: string;
  token_uuid: string;
  issuer: string;
  base64PrivateKeyPem: "ACCESS_TOKEN_PRIVATE_KEY" | "REFRESH_TOKEN_PRIVATE_KEY";
  expiresIn: Date;
}) => {
  const header: Header = {
    alg: "RS256",
    typ: "JWT",
  };

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const tokenExpiresIn = getNumericDate(expiresIn);

  const payload: Payload = {
    iss: issuer,
    iat: nowInSeconds,
    exp: tokenExpiresIn,
    sub: user_id,
    token_uuid,
  };

  const cryptoPrivateKey = await convertToCryptoKey({
    pemKey: atob(Deno.env.get(base64PrivateKeyPem) as unknown as string),
    type: "PRIVATE",
  });

  const token = await create(header, payload, cryptoPrivateKey!);

  return { token, token_uuid };
};

export const verifyJwt = async <T>({
  token,
  base64PublicKeyPem,
}: {
  token: string;
  base64PublicKeyPem: "ACCESS_TOKEN_PUBLIC_KEY" | "REFRESH_TOKEN_PUBLIC_KEY";
}): Promise<T | null> => {
  try {
    const cryptoPublicKey = await convertToCryptoKey({
      pemKey: atob(Deno.env.get(base64PublicKeyPem) as unknown as string),
      type: "PUBLIC",
    });

    return (await verify(token, cryptoPublicKey!)) as T;
  } catch (error) {
    console.log(error);
    return null;
  }
};
