import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeCaseNamingStrategy } from './strategies/snake-naming.strategy';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === 'true',
  namingStrategy: new SnakeCaseNamingStrategy(),
  entities: ['src/modules/**/domain/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
