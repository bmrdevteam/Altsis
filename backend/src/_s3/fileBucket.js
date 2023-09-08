import _ from "lodash";
import aws from "aws-sdk";
import { parseISO, addSeconds } from "date-fns";

export const fileS3 = new aws.S3({
  accessKeyId: process.env["s3_accessKeyId2"].trim(),
  secretAccessKey: process.env["s3_secretAccessKey2"].trim(),
  region: process.env["s3_region"].trim(),
  signatureVersion: "v4",
});

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
