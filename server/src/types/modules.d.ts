declare module "cloudinary" {
  export const v2: {
    config(options: Record<string, string | undefined>): void;
    uploader: {
      upload(path: string, options?: Record<string, unknown>): Promise<Record<string, unknown>>;
      upload_stream(
        options: Record<string, unknown>,
        callback: (error: Error | undefined, result?: Record<string, any>) => void,
      ): NodeJS.WritableStream;
    };
  };
}

declare module "dotenv" {
  export function config(options?: Record<string, unknown>): { parsed?: Record<string, string> };
}

declare module "http-status-codes" {
  export const StatusCodes: Record<string, number>;
}
