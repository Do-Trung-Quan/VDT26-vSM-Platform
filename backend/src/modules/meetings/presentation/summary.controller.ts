import {
  Controller, Get, HttpCode, HttpStatus,
  Param, Post, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ParseUuidOr400Pipe } from '../../../common/pipes/parse-uuid-or-400.pipe';
import { GetSummaryHandler } from '../application/query/get-summary.handler';
import { GenerateSummaryHandler } from '../application/command/generate-summary.handler';
import { ExportPdfHandler } from '../application/query/export-pdf.handler';
import { MeetingSummaryStatus } from '../domain/entities/meeting-summary.entity';

@Controller('meetings')
@UseGuards(JwtAuthGuard)
export class SummaryController {
  constructor(
    private readonly getSummaryHandler:      GetSummaryHandler,
    private readonly generateSummaryHandler: GenerateSummaryHandler,
    private readonly exportPdfHandler:       ExportPdfHandler,
  ) {}

  /** Trigger tóm tắt AI — idempotent, an toàn gọi nhiều lần */
  @Post(':id/summary')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerSummary(
    @Param('id', ParseUuidOr400Pipe) id: string,
  ): Promise<{ message: string }> {
    return this.generateSummaryHandler.execute(id);
  }

  /** Lấy trạng thái / kết quả tóm tắt */
  @Get(':id/summary')
  async getSummary(
    @Param('id', ParseUuidOr400Pipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
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

  /** Xuất biên bản PDF */
  @Get(':id/export/pdf')
  async exportPdf(
    @Param('id', ParseUuidOr400Pipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.exportPdfHandler.execute(id);
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="bien-ban-${id}.pdf"`,
      'Content-Length':      buffer.length,
    });
    res.end(buffer);
  }
}
