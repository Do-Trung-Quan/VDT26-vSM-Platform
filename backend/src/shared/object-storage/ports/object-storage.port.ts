export interface IObjectStoragePort {
  upload(buffer: Buffer, key: string, contentType?: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expirySeconds?: number): Promise<string>;
  /** Tạo presigned PUT URL để browser upload file trực tiếp lên MinIO (bypass backend proxy) */
  getPresignedPutUrl(key: string, expirySeconds?: number): Promise<string>;
  remove(key: string): Promise<void>;
}
