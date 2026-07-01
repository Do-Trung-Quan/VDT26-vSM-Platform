import { Injectable } from '@nestjs/common';

interface SpeakerEntry {
  centroid: number[];
  count: number;
  label: string;
}

interface DiarizationSession {
  speakers: SpeakerEntry[];
  nextSpeakerIndex: number;
}

const SIMILARITY_ASSIGN = 0.40; // ngưỡng nhận cùng người nói
const SIMILARITY_MERGE = 0.50; // ngưỡng gộp 2 centroid trùng lặp

@Injectable()
export class SpeakerDiarizationService {
  private readonly sessions = new Map<string, DiarizationSession>();

  /**
   * Gán nhãn người nói cho 1 utterance.
   * @param embedding  Vector 512-dim từ Viettel API (null nếu segment quá ngắn/nhiễu)
   * @returns  Label vd "Người nói 1"
   */
  assignLabel(sessionId: string, embedding: number[] | null): string {
    const session = this.getOrCreate(sessionId);
    if (!embedding) return 'Không rõ';

    let bestLabel = '';
    let bestSim = -1;

    for (const sp of session.speakers) {
      const sim = this.cosine(embedding, sp.centroid);
      if (sim > bestSim) { bestSim = sim; bestLabel = sp.label; }
    }

    if (bestSim >= SIMILARITY_ASSIGN) {
      // Cập nhật centroid bằng running average
      const sp = session.speakers.find(s => s.label === bestLabel)!;
      sp.centroid = this.updateCentroid(sp.centroid, embedding, sp.count);
      sp.count++;
      this.tryMerge(session);
      return bestLabel;
    }

    // Người nói mới
    const newLabel = `Người nói ${session.nextSpeakerIndex++}`;
    session.speakers.push({ label: newLabel, centroid: [...embedding], count: 1 });
    return newLabel;
  }

  /** Đổi tên nhãn (khi user chỉnh sửa trực tiếp). */
  renameLabel(sessionId: string, oldLabel: string, newLabel: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const sp = session.speakers.find(s => s.label === oldLabel);
    if (sp) sp.label = newLabel;
  }

  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  // ── Offline clustering (dùng cho Upload batch) ─────────────────────────────

  /**
   * Agglomerative clustering: gán nhãn nhất quán cho N embeddings của toàn bộ file.
   * @returns  Mảng label cùng chiều dài với embeddings đầu vào.
   */
  clusterOffline(embeddings: (number[] | null)[]): string[] {
    const clusters: { centroid: number[]; label: string; count: number }[] = [];
    let nextIdx = 1;

    return embeddings.map(emb => {
      if (!emb) return 'Không rõ';

      let bestSim = -1;
      let bestLabel = '';
      for (const c of clusters) {
        const sim = this.cosine(emb, c.centroid);
        if (sim > bestSim) { bestSim = sim; bestLabel = c.label; }
      }

      if (bestSim >= SIMILARITY_ASSIGN) {
        const c = clusters.find(x => x.label === bestLabel)!;
        c.centroid = this.updateCentroid(c.centroid, emb, c.count);
        c.count++;
        return bestLabel;
      }

      const label = `Người nói ${nextIdx++}`;
      clusters.push({ label, centroid: [...emb], count: 1 });
      return label;
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private cosine(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
  }

  private updateCentroid(old: number[], newVec: number[], count: number): number[] {
    return old.map((v, i) => (v * count + newVec[i]) / (count + 1));
  }

  /** Gộp 2 centroid có similarity > SIMILARITY_MERGE (tránh phân mảnh). */
  private tryMerge(session: DiarizationSession): void {
    const sps = session.speakers;
    for (let i = 0; i < sps.length; i++) {
      for (let j = i + 1; j < sps.length; j++) {
        if (this.cosine(sps[i].centroid, sps[j].centroid) > SIMILARITY_MERGE) {
          // Gộp j vào i (giữ nhãn của i — nhãn xuất hiện trước)
          const totalCount = sps[i].count + sps[j].count;
          sps[i].centroid = sps[i].centroid.map(
            (v, k) => (v * sps[i].count + sps[j].centroid[k] * sps[j].count) / totalCount,
          );
          sps[i].count = totalCount;
          sps.splice(j, 1);
          return; // 1 merge per call là đủ
        }
      }
    }
  }

  private getOrCreate(sessionId: string): DiarizationSession {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { speakers: [], nextSpeakerIndex: 1 });
    }
    return this.sessions.get(sessionId)!;
  }
}
