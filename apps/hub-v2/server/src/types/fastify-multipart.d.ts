declare module "@fastify/multipart" {
  import type { FastifyPluginAsync } from "fastify";
  import type { Readable } from "node:stream";

  export interface MultipartValue<T = unknown> {
    value: T;
  }

  export interface MultipartFile {
    filename: string;
    mimetype: string;
    file: Readable;
    fields: Record<string, MultipartValue<string | undefined>>;
  }

  export interface FastifyMultipartOptions {
    limits?: {
      fileSize?: number;
      files?: number;
    };
  }

  const fastifyMultipart: FastifyPluginAsync<FastifyMultipartOptions>;
  export default fastifyMultipart;
}

declare module "fastify" {
  interface FastifyRequest {
    file(): Promise<import("@fastify/multipart").MultipartFile | undefined>;
  }
}

export {};
