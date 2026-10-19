import aws from "aws-sdk";
import { fileS3, fileS3Options, signUrlForView, viewableFileUrl } from "../../src/_s3/fileBucket.js";

const creds = {
  s3_accessKeyId2: "test-access-key-2",
  s3_secretAccessKey2: "test-secret-key-2",
  s3_region: "ap-northeast-2",
};

describe("file bucket client", () => {
  test("no endpoint keeps the AWS client options and signs on amazonaws", () => {
    const options = fileS3Options(creds);
    expect(options).toEqual({
      accessKeyId: "test-access-key-2",
      secretAccessKey: "test-secret-key-2",
      region: "ap-northeast-2",
      signatureVersion: "v4",
    });
    expect(options).not.toHaveProperty("endpoint");
    expect(options).not.toHaveProperty("s3ForcePathStyle");
    expect(fileS3Options({ ...creds, s3_endpoint2: "   " })).not.toHaveProperty("endpoint");

    const client = new aws.S3(options);
    const url = client.getSignedUrl("getObject", {
      Bucket: "altsis-files",
      Key: "academy/chart.png",
      Expires: 60,
    });
    const parsed = new URL(url);
    expect(parsed.protocol).toBe("https:");
    expect(parsed.host).toBe("altsis-files.s3.ap-northeast-2.amazonaws.com");
    expect(parsed.pathname).toBe("/academy/chart.png");
    expect(parsed.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");

    if (!String(process.env.s3_endpoint2 || "").trim()) {
      const live = new URL(signUrlForView("academy/chart.png", 60));
      expect(live.protocol).toBe("https:");
      expect(live.host.endsWith(".amazonaws.com")).toBe(true);
      expect(fileS3.config.s3ForcePathStyle).toBeFalsy();
    }
  });

  test("an endpoint signs on that host in path style", () => {
    const options = fileS3Options({
      ...creds,
      s3_endpoint2: " http://127.0.0.1:9000 ",
    });
    expect(options.endpoint).toBe("http://127.0.0.1:9000");
    expect(options.s3ForcePathStyle).toBe(true);
    expect(options.signatureVersion).toBe("v4");

    const client = new aws.S3(options);
    const url = client.getSignedUrl("getObject", {
      Bucket: "local-bucket",
      Key: "academy/chart.png",
      Expires: 60,
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe("http://127.0.0.1:9000");
    expect(parsed.pathname).toBe("/local-bucket/academy/chart.png");
    expect(parsed.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(parsed.searchParams.get("X-Amz-Credential")).toContain("/ap-northeast-2/s3/aws4_request");
  });

  test("s3_forcePathStyle2 false keeps the endpoint and turns path style off", () => {
    const options = fileS3Options({
      ...creds,
      s3_endpoint2: "http://127.0.0.1:9000",
      s3_forcePathStyle2: "false",
    });
    expect(options.endpoint).toBe("http://127.0.0.1:9000");
    expect(options.s3ForcePathStyle).toBe(false);
    expect(fileS3Options({ ...creds, s3_endpoint2: "http://127.0.0.1:9000", s3_forcePathStyle2: "0" }).s3ForcePathStyle).toBe(false);
    expect(fileS3Options({ ...creds, s3_endpoint2: "http://127.0.0.1:9000", s3_forcePathStyle2: "true" }).s3ForcePathStyle).toBe(true);
  });

  test("http image urls are limited to the configured endpoint", () => {
    const signed = "http://127.0.0.1:9000/local-bucket/a.png?X-Amz-Signature=abc";
    expect(viewableFileUrl(signed, "http://127.0.0.1:9000")).toBe(signed);
    expect(viewableFileUrl(signed, "http://127.0.0.1:9001")).toBe("");
    expect(viewableFileUrl(signed, "")).toBe("");
    expect(viewableFileUrl("http://evil.example/a.png", "http://127.0.0.1:9000")).toBe("");
    expect(viewableFileUrl("https://altsis-files.s3.ap-northeast-2.amazonaws.com/a.png", "")).toMatch(/^https:\/\//);
  });
});
