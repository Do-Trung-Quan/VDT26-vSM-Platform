import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { IObjectStoragePort } from '../ports/object-storage.port';

@Injectable()
export class MinioObjectStorageAdapter implements IObjectStoragePort, OnModuleInit {
  private readonly logger = new Logger(MinioObjectStorageAdapter.name);
  private readonly client: Client;
  private readonly bucket: string;
  private readonly internalBase: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('storage.bucket')!;
    const endpoint = this.configService.get<string>('storage.endpoint')!;
    const port     = this.configService.get<number>('storage.port');
    const useSSL   = this.configService.get<boolean>('storage.useSSL');

    this.internalBase = `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`;

    this.client = new Client({
      endPoint:  endpoint,
      port,
      useSSL,
      accessKey: this.configService.get<string>('storage.accessKey')!,
      secretKey: this.configService.get<string>('storage.secretKey')!,
      region:    this.configService.get<string>('storage.region'),
    });
  }

  /** Cấu hình CORS cho bucket khi backend khởi động — cho phép browser PUT trực tiếp */
  async onModuleInit(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.client as any).setBucketCors(this.bucket, {
        CORSRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'PUT', 'HEAD', 'DELETE'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
            MaxAgeSeconds: 3600,
          },
        ],
      });
      this.logger.log(`[MinIO] CORS configured for bucket "${this.bucket}"`);
    } catch (err) {
      this.logger.warn(`[MinIO] Could not configure CORS (may already be set): ${err}`);
    }
  }

  async upload(buffer: Buffer, key: string, contentType?: string): Promise<string> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      ...(contentType ? { 'Content-Type': contentType } : {}),
    });
    return `/${this.bucket}/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async getSignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  async getPresignedPutUrl(key: string, expirySeconds = 1800): Promise<string> {
    const url = await this.client.presignedPutObject(this.bucket, key, expirySeconds);
    // Thay thế internal endpoint (vd: http://minio:9000) bằng public URL để browser có thể truy cập
    const publicUrl = this.configService.get<string>('storage.publicUrl');
    if (publicUrl) {
      return url.replace(this.internalBase, publicUrl.replace(/\/$/, ''));
    }
    return url;
  }

  async remove(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
