import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { validate as isUuid } from 'uuid';

@Injectable()
export class ParseUuidOr400Pipe implements PipeTransform<string, string> {
  transform(value: string, _metadata: ArgumentMetadata): string {
    if (!isUuid(value)) {
      throw new BadRequestException(`'${value}' is not a valid UUID`);
    }
    return value;
  }
}
