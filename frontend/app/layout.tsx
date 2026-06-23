import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MP2 – Intelligent Meeting Transcription System",
  description: "Ghi âm, chuyển giọng nói, tóm tắt AI, xuất biên bản PDF.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
