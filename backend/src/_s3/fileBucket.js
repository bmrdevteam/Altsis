import _ from "lodash";
import aws from "aws-sdk";
import { parseISO, addSeconds } from "date-fns";

/**
 * File-bucket client options. With no `s3_endpoint2`, this is the AWS default:
 * region, keys, and signature v4 only. A set endpoint (MinIO and other
 * S3-compatible stores) also uses path-style URLs unless
 * `s3_forcePathStyle2` is `false` or `0`.
 */
export const fileS3Options = (env = process.env) => {
  const options = {
    accessKeyId: env["s3_accessKeyId2"].trim(),
    secretAccessKey: env["s3_secretAccessKey2"].trim(),
    region: env["s3_region"].trim(),
    signatureVersion: "v4",
  };
  const endpoint = typeof env["s3_endpoint2"] === "string" ? env["s3_endpoint2"].trim() : "";
  if (!endpoint) return options;
  const pathStyle = String(env["s3_forcePathStyle2"] ?? "").trim().toLowerCase();
  options.endpoint = endpoint;
  options.s3ForcePathStyle = !(pathStyle === "false" || pathStyle === "0");
  return options;
};

export const fileS3 = new aws.S3(fileS3Options());

const MAX_VIEW_URL = 2000;

/** https, or http only when it is the configured file-bucket endpoint. */
export const viewableFileUrl = (value, endpoint = process.env.s3_endpoint2) => {
  const url = String(value || "").trim();
  if (!url || url.length > MAX_VIEW_URL || /\s/.test(url)) return "";
  if (/^https:\/\/\S+$/i.test(url)) return url;
  if (!/^http:\/\/\S+$/i.test(url)) return "";
  const base = String(endpoint || "").trim();
  if (!base) return "";
  try {
    const signed = new URL(url);
    const local = new URL(base);
    if (signed.protocol !== "http:" || local.protocol !== "http:") return "";
    if (signed.host !== local.host) return "";
    return url;
  } catch (_) {
    return "";
  }
};

export const fileBucket = process.env["s3_bucket2"].trim();

const signedUrlExpireSeconds = 60 * 5;

export const signUrl = (key, filename, seconds = signedUrlExpireSeconds) => {
  const preSignedUrl = fileS3.getSignedUrl("getObject", {
    Bucket: fileBucket,
    Key: key,
    Expires: seconds,
    ResponseContentDisposition: `attachment; filename ="${encodeURI(
      filename
    )}"`,
    // ContentType: "image/*",
  });

  const params = new URL(preSignedUrl).searchParams;
  const creationDate = parseISO(params.get("X-Amz-Date"));
  const expiresInSecs = Number(params.get("X-Amz-Expires"));
  const expiryDate = addSeconds(creationDate, expiresInSecs);

  return { preSignedUrl, expiryDate };
};

/**
 * Sign URL for inline viewing (without forced download)
 */
export const signUrlForView = (key, seconds = signedUrlExpireSeconds) => {
  const preSignedUrl = fileS3.getSignedUrl("getObject", {
    Bucket: fileBucket,
    Key: key,
    Expires: seconds,
  });

  return preSignedUrl;
};
