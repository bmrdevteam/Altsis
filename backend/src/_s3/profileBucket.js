import aws from "aws-sdk";

export const profileS3 = new aws.S3({
  accessKeyId: process.env["s3_accessKeyId"].trim(),
  secretAccessKey: process.env["s3_secretAccessKey"].trim(),
  region: process.env["s3_region"].trim(),
});

export const profileBucket = process.env["s3_bucket"].trim();
