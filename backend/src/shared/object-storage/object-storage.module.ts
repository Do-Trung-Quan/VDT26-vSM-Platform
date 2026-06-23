import { Module } from '@nestjs/common';
import { OBJECT_STORAGE_PORT } from './object-storage.tokens';
import { MinioObjectStorageAdapter } from './adapters/minio-object-storage.adapter';

@Module({
  providers: [
    { provide: OBJECT_STORAGE_PORT, useClass: MinioObjectStorageAdapter },
  ],
  exports: [OBJECT_STORAGE_PORT],
})
export class ObjectStorageModule {}
