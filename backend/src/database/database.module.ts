import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { types } from 'pg';
import { SnakeCaseNamingStrategy } from './strategies/snake-naming.strategy';

// Fix timezone: pg driver parses "timestamp without time zone" as LOCAL time by default.
// Appending 'Z' forces UTC interpretation globally — affects all @CreateDateColumn / @UpdateDateColumn.
types.setTypeParser(1114, (val: string) => new Date(val + 'Z'));

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        ssl: configService.get<boolean>('database.ssl'),
        extra: {
          max: configService.get<number>('database.poolSize'),
        },
        namingStrategy: new SnakeCaseNamingStrategy(),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
