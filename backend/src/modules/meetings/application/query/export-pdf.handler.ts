import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IMeetingRepository } from '../../domain/ports/meeting.repository.port';
import { ITranscriptBlockRepository } from '../../domain/ports/transcript-block.repository.port';
import { IPdfExporterPort } from '../../domain/ports/pdf-exporter.port';
import { MEETING_REPOSITORY, TRANSCRIPT_BLOCK_REPOSITORY, PDF_EXPORTER_PORT } from '../../meetings.tokens';

@Injectable()
export class ExportPdfHandler {
  constructor(
    @Inject(MEETING_REPOSITORY)          private readonly meetingRepo: IMeetingRepository,
    @Inject(TRANSCRIPT_BLOCK_REPOSITORY) private readonly blockRepo: ITranscriptBlockRepository,
    @Inject(PDF_EXPORTER_PORT)           private readonly pdfExporter: IPdfExporterPort,
  ) {}

  async execute(meetingId: string): Promise<Buffer> {
    const meeting = await this.meetingRepo.findActiveById(meetingId);
    if (!meeting) throw new NotFoundException('Cuộc họp không tồn tại');

    const blocks = await this.blockRepo.findByMeeting(meetingId);
    return this.pdfExporter.export(meeting, blocks);
  }
}
