import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { IObjectStoragePort } from '../ports/object-storage.port';

/**
 * Triển khai IObjectStoragePort bằng SDK MinIO/S3; trả về URL bền vững lưu vào DB
 * (audio cuộc họp sau finalize + avatar người dùng).
 */
@Injectable()
export class MinioObjectStorageAdapter implements IObjectStoragePort {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('storage.bucket')!;
    this.client = new Client({
      endPoint: this.configService.get<string>('storage.endpoint')!,
      port: this.configService.get<number>('storage.port'),
      useSSL: this.configService.get<boolean>('storage.useSSL'),
      accessKey: this.configService.get<string>('storage.accessKey')!,
      secretKey: this.configService.get<string>('storage.secretKey')!,
      region: this.configService.get<string>('storage.region'),
    });
  }

  async upload(buffer: Buffer, key: string, contentType?: string): Promise<string> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      ...(contentType ? { 'Content-Type': contentType } : {}),
    });
    return `/${this.bucket}/${key}`;
  }

  async getSignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async remove(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
