export interface IObjectStoragePort {
  upload(buffer: Buffer, key: string, contentType?: string): Promise<string>;
  getSignedUrl(key: string, expirySeconds?: number): Promise<string>;
  remove(key: string): Promise<void>;
}
