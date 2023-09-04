import { OAuth2Client } from "google-auth-library";

export const getPayload = async (credential) => {
  try {
    const client = new OAuth2Client(process.env["GOOGLE_CLIENT_ID"]);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env["GOOGLE_CLIENT_ID"],
    });
    const payload = ticket.getPayload();
    return payload;
  } catch (err) {
    throw err;
  }
};
