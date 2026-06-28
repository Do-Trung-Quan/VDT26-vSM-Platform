import { Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ParseUuidOr400Pipe } from '../../../common/pipes/parse-uuid-or-400.pipe';
import { GetSummaryHandler } from '../application/query/get-summary.handler';
import { MeetingSummaryStatus } from '../domain/entities/meeting-summary.entity';

@Controller('meetings')
export class SummaryController {
  constructor(private readonly getSummaryHandler: GetSummaryHandler) {}

  @Post(':id/summary')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSummary(@Param('id', ParseUuidOr400Pipe) id: string): Promise<{ message: string }> {
    return { message: 'Tính năng tóm tắt AI sẽ ra mắt trong bản cập nhật tiếp theo' };
  }

  @Get(':id/summary')
  async getSummary(@Param('id', ParseUuidOr400Pipe) id: string, @Res() res: Response): Promise<void> {
    const result = await this.getSummaryHandler.execute(id);

    if (result.status === 'NOT_STARTED' || result.status === MeetingSummaryStatus.PROCESSING) {
      res.status(HttpStatus.ACCEPTED).json({
        statusCode: 202, message: 'Tóm tắt đang được xử lý',
        data: { status: result.status }, meta: null,
      });
      return;
    }

    res.status(HttpStatus.OK).json({
      statusCode: 200, message: 'Success',
      data: { status: result.status, summaryText: result.summaryText }, meta: null,
    });
  }
}
