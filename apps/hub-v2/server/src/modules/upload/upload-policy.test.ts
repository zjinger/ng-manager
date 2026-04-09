import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppError } from "../../shared/errors/app-error";
import { assertUploadAllowed, resolveUploadPolicy } from "./upload-policy";

describe("upload policy", () => {
  it("allows issue attachment videos", () => {
    const policy = resolveUploadPolicy("issues", "attachment");

    assert.doesNotThrow(() =>
      assertUploadAllowed(
        {
          fileName: "screen-record.mp4",
          mimeType: "video/mp4",
          fileSize: 4 * 1024 * 1024
        },
        policy,
        10 * 1024 * 1024
      )
    );
  });

  it("rejects issue attachment office documents before policy is opened", () => {
    const policy = resolveUploadPolicy("issues", "attachment");

    assert.throws(
      () =>
        assertUploadAllowed(
          {
            fileName: "需求说明.pdf",
            mimeType: "application/pdf",
            fileSize: 512 * 1024
          },
          policy,
          10 * 1024 * 1024
        ),
      (error) => error instanceof AppError && error.message === "仅支持上传图片或视频文件"
    );
  });

  it("maps markdown uploads to the image-only policy even when bucket is temp", () => {
    const policy = resolveUploadPolicy("temp", "markdown");

    assert.throws(
      () =>
        assertUploadAllowed(
          {
            fileName: "capture.mp4",
            mimeType: "video/mp4",
            fileSize: 512 * 1024
          },
          policy,
          10 * 1024 * 1024
        ),
      (error) => error instanceof AppError && error.message === "仅支持图片文件"
    );
  });
});
