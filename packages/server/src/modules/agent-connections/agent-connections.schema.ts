import { GlobalError, GlobalErrorCodes } from "@yinuo-ngm/errors";
import type {
  CreateHubV2ConnectionInput,
  UpdateHubV2ConnectionInput,
} from "./agent-connections.types";

const NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

function ensureObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, message);
  }
  return value as Record<string, unknown>;
}

function readOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, `${fieldName} must be string`);
  }
  const text = value.trim();
  return text || undefined;
}

function readRequiredString(value: unknown, fieldName: string): string {
  const text = readOptionalString(value, fieldName);
  if (!text) {
    throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, `${fieldName} is required`);
  }
  return text;
}

function ensureValidName(name: string, fieldName: string): string {
  if (!NAME_PATTERN.test(name)) {
    throw new GlobalError(
      GlobalErrorCodes.BAD_REQUEST,
      `${fieldName} only allows [a-zA-Z0-9._-]`
    );
  }
  return name;
}

function ensureHttpUrl(url: string, fieldName: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    throw new GlobalError(
      GlobalErrorCodes.BAD_REQUEST,
      `${fieldName} must start with http:// or https://`
    );
  }
}

function readOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new GlobalError(GlobalErrorCodes.BAD_REQUEST, `${fieldName} must be boolean`);
  }
  return value;
}

function readOptionalNullableString(
  value: unknown,
  fieldName: string
): string | null | undefined {
  if (value === undefined || value === null) {
    return value as null | undefined;
  }
  if (typeof value !== "string") {
    throw new GlobalError(
      GlobalErrorCodes.BAD_REQUEST,
      `${fieldName} must be string|null`
    );
  }
  return value;
}

export function parseHubV2NameParam(value: unknown): string {
  const name = readRequiredString(value, "name");
  return ensureValidName(name, "name");
}

export function parseCreateHubV2ConnectionInput(input: unknown): CreateHubV2ConnectionInput {
  const body = ensureObject(input, "invalid request body");
  const name = ensureValidName(readRequiredString(body.name, "name"), "name");
  const baseUrl = ensureHttpUrl(readRequiredString(body.baseUrl, "baseUrl"), "baseUrl");
  const projectKey = readRequiredString(body.projectKey, "projectKey");
  const projectName = readOptionalString(body.projectName, "projectName");
  const projectToken = readOptionalNullableString(body.projectToken, "projectToken");
  const personalToken = readOptionalNullableString(body.personalToken, "personalToken");
  const isDefault = readOptionalBoolean(body.isDefault, "isDefault");

  return {
    name,
    baseUrl,
    projectKey,
    projectName,
    projectToken,
    personalToken,
    isDefault,
  };
}

export function parseUpdateHubV2ConnectionInput(input: unknown): UpdateHubV2ConnectionInput {
  const body = ensureObject(input, "invalid request body");
  const next: UpdateHubV2ConnectionInput = {};

  if (Object.prototype.hasOwnProperty.call(body, "baseUrl")) {
    next.baseUrl = ensureHttpUrl(readRequiredString(body.baseUrl, "baseUrl"), "baseUrl");
  }
  if (Object.prototype.hasOwnProperty.call(body, "projectKey")) {
    next.projectKey = readRequiredString(body.projectKey, "projectKey");
  }
  if (Object.prototype.hasOwnProperty.call(body, "projectName")) {
    next.projectName = readOptionalString(body.projectName, "projectName");
  }
  if (Object.prototype.hasOwnProperty.call(body, "projectToken")) {
    next.projectToken = readOptionalNullableString(body.projectToken, "projectToken");
  }
  if (Object.prototype.hasOwnProperty.call(body, "personalToken")) {
    next.personalToken = readOptionalNullableString(body.personalToken, "personalToken");
  }
  if (Object.prototype.hasOwnProperty.call(body, "isDefault")) {
    next.isDefault = readOptionalBoolean(body.isDefault, "isDefault");
  }

  return next;
}
