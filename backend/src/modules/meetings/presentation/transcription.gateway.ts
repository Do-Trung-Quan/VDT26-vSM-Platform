import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../../../queue/queue.constants';
import { WsOpenSessionDto } from '../application/dto/ws-open-session.dto';
import { WsResumeDto } from '../application/dto/ws-resume.dto';
import { LiveSessionService } from '../application/streaming/live-session.service';
import { TranscriptionService } from '../application/streaming/transcription.service';
import { FinalizeSessionService } from '../application/streaming/finalize-session.service';
import { ReconnectService } from '../application/streaming/reconnect.service';
import { SpeakerDiarizationService } from '../application/streaming/speaker-diarization.service';
import { SessionTimeoutPayload } from '../application/listeners/live-session-timeout.listener';
import { Inject } from '@nestjs/common';
import { ITranscriptBlockRepository } from '../domain/ports/transcript-block.repository.port';
import { TRANSCRIPT_BLOCK_REPOSITORY } from '../meetings.tokens';

/** Metadata gắn vào socket khi open_session thành công. */
interface SessionMeta {
  meetingId: string;
  userId: string;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/live' })
@Injectable()
export class TranscriptionGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TranscriptionGateway.name);
  private readonly resumeTtlSeconds: number;

  // socket.id → SessionMeta
  private readonly socketSessions = new Map<string, SessionMeta>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly cfg: ConfigService,
    private readonly liveSessionSvc: LiveSessionService,
    private readonly transcriptionSvc: TranscriptionService,
    private readonly finalizeSvc: FinalizeSessionService,
    private readonly reconnectSvc: ReconnectService,
    private readonly diarizationSvc: SpeakerDiarizationService,
    @Inject(TRANSCRIPT_BLOCK_REPOSITORY) private readonly transcriptRepo: ITranscriptBlockRepository,
    @InjectQueue(QUEUE_NAMES.LIVE_SESSION_TIMEOUT) private readonly timeoutQueue: Queue,
  ) {
    this.resumeTtlSeconds = cfg.get<number>('transcription.liveResumeTtlSeconds') ?? 120;
  }

  // ── open_session ──────────────────────────────────────────────────────────

  @SubscribeMessage('open_session')
  async handleOpenSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsOpenSessionDto,
  ) {
    try {
      const payload = this.verifyToken(data.token);

      await this.liveSessionSvc.openSession(data.meetingId, payload.id);

      this.socketSessions.set(client.id, {
        meetingId: data.meetingId,
        userId: payload.id,
      });

      this.logger.log(`open_session: meeting=${data.meetingId} socket=${client.id}`);
      client.emit('session_ready', { meetingId: data.meetingId });
    } catch (err) {
      this.logger.warn(`open_session failed: ${err}`);
      client.emit('error', { message: (err as Error).message });
      client.disconnect(true);
    }
  }

  // ── audio_chunk ───────────────────────────────────────────────────────────

  @SubscribeMessage('audio_chunk')
  async handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string; audio: number[] | Buffer },
  ) {
    const meta = this.socketSessions.get(client.id);
    if (!meta || meta.meetingId !== data.meetingId) return;

    // Append raw PCM vào file tạm
    const pcm = Buffer.isBuffer(data.audio)
      ? data.audio
      : Buffer.from(data.audio as number[]);

    // Ghi vào local storage (fire-and-forget, lỗi sẽ log)
    // Cũng append cho VAD processing
    try {
      const blocks = await this.transcriptionSvc.processChunk(meta.meetingId, pcm);
      for (const block of blocks) {
        client.emit('transcript_update', {
          sequenceNumber: block.sequenceNumber,
          text: block.text,
          speakerLabel: block.speakerLabel,
          startTime: block.startTime,
          endTime: block.endTime,
        });
      }
    } catch (err) {
      this.logger.error(`audio_chunk error meeting=${meta.meetingId}: ${err}`);
    }
  }

  // ── edit_speaker ──────────────────────────────────────────────────────────

  @SubscribeMessage('edit_speaker')
  async handleEditSpeaker(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string; fromSequence: number; oldLabel: string; newLabel: string },
  ) {
    const meta = this.socketSessions.get(client.id);
    if (!meta || meta.meetingId !== data.meetingId) return;

    // Cập nhật DB cho các block đã lưu
    await this.transcriptRepo.updateSpeakerLabelFrom(
      data.meetingId,
      data.fromSequence,
      data.newLabel,
    );

    // Cập nhật diarization registry để các utterance mới tiếp tục đúng nhãn
    this.diarizationSvc.renameLabel(data.meetingId, data.oldLabel, data.newLabel);

    client.emit('speaker_updated', { ok: true });
  }

  // ── end_session ───────────────────────────────────────────────────────────

  @SubscribeMessage('end_session')
  async handleEndSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string },
  ) {
    const meta = this.socketSessions.get(client.id);
    if (!meta || meta.meetingId !== data.meetingId) return;

    try {
      await this.finalizeSvc.finalize(meta.meetingId, meta.userId);
      client.emit('session_ended', { meetingId: meta.meetingId });
    } catch (err) {
      this.logger.error(`end_session error: ${err}`);
      client.emit('error', { message: 'Lưu biên bản thất bại' });
    } finally {
      this.socketSessions.delete(client.id);
      client.disconnect(true);
    }
  }

  // ── resume (Core 3) ───────────────────────────────────────────────────────

  @SubscribeMessage('resume')
  async handleResume(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WsResumeDto,
  ) {
    try {
      const payload = this.verifyToken(data.token);

      // Hủy timeout job nếu đang chờ
      await this.cancelTimeoutJob(data.meetingId);

      const { missedBlocks, vadReinitialized } = await this.reconnectSvc.resumeSession(
        data.meetingId,
        data.lastReceivedSequence,
      );

      this.socketSessions.set(client.id, {
        meetingId: data.meetingId,
        userId: payload.id,
      });

      // Gửi missed_blocks (transcript đã xử lý nhưng client chưa nhận)
      client.emit('resume_ok', {
        meetingId: data.meetingId,
        vadReinitialized,
        missedBlocks: missedBlocks.map(b => ({
          sequenceNumber: b.sequenceNumber,
          text: b.text,
          speakerLabel: b.speakerLabel,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
      });

      this.logger.log(
        `resume: meeting=${data.meetingId} missed=${missedBlocks.length} socket=${client.id}`,
      );
    } catch (err) {
      this.logger.warn(`resume failed: ${err}`);
      client.emit('error', { message: (err as Error).message });
      client.disconnect(true);
    }
  }

  // ── handleDisconnect (Core 3) ─────────────────────────────────────────────

  async handleDisconnect(client: Socket): Promise<void> {
    const meta = this.socketSessions.get(client.id);
    if (!meta) return;

    this.logger.log(`disconnect: meeting=${meta.meetingId} socket=${client.id}`);
    this.socketSessions.delete(client.id);

    // Đặt TTL resume trên Redis
    await this.liveSessionSvc.onDisconnect(meta.meetingId, meta.userId);

    // Schedule BullMQ delayed job — fallback nếu client không resume
    const payload: SessionTimeoutPayload = {
      meetingId: meta.meetingId,
      userId: meta.userId,
    };
    await this.timeoutQueue.add(
      JOB_NAMES.SESSION_TIMEOUT,
      payload,
      {
        delay: this.resumeTtlSeconds * 1000,
        jobId: `timeout-${meta.meetingId}`,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private verifyToken(token: string): { id: string; role: string; departmentId: string } {
    try {
      const decoded = this.jwtService.verify<{
        sub: string; role: string; departmentId: string;
      }>(token, {
        secret: this.cfg.get<string>('jwt.accessSecret'),
      });
      return { id: decoded.sub, role: decoded.role, departmentId: decoded.departmentId };
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  private async cancelTimeoutJob(meetingId: string): Promise<void> {
    try {
      const job = await this.timeoutQueue.getJob(`timeout-${meetingId}`);
      if (job) await job.remove();
    } catch { /* bỏ qua nếu job không tồn tại */ }
  }
}
