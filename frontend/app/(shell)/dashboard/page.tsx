"use client";
import { useState } from "react";
import { TrendingUp, TrendingDown, Users, Clock, BarChart3, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TREND_DATA, HEADCOUNT } from "@/lib/data";
import { cn } from "@/lib/utils";

const KPIS = [
  { label: "Tổng số cuộc họp", value: "142",    trend: "▲ 12% so với tháng trước", up: true,  icon: BarChart3, iconBg: "bg-brand/10 text-brand"   },
  { label: "Tổng giờ audio",   value: "318.5h", trend: "▲ 8% so với tháng trước",  up: true,  icon: Mic,       iconBg: "bg-info/10 text-info"       },
  { label: "User đang active", value: "87",     trend: "▲ 3 user mới",              up: true,  icon: Users,     iconBg: "bg-ok/10 text-ok"           },
  { label: "TB giờ / cuộc họp",value: "2.24h", trend: "▼ 0.1h so với tháng trước", up: false, icon: Clock,     iconBg: "bg-warn/10 text-warn-dark"  },
];

const TOP_DEPTS = [
  { name: "Phòng Kỹ thuật",   count: 42, color: "#EE0033" },
  { name: "Phòng Kinh doanh", count: 31, color: "#2D6CDF" },
  { name: "Phòng CSKH",       count: 24, color: "#2E9E5B" },
  { name: "Phòng Marketing",  count: 18, color: "#E8A23D" },
  { name: "Phòng Tài chính",  count: 11, color: "#8B5CF6" },
];
const MAX_COUNT = 42;

const MONTHS = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
const YEARS  = ["2024","2025","2026"];

function TrendChart() {
  const W = 860, H = 220, padL = 32, padR = 24, padT = 12, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maxM = 20, maxHr = 45;
  const bw = iw / TREND_DATA.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
      {[0,.25,.5,.75,1].map((g,i)=>(
        <line key={i} x1={padL} x2={W-padR} y1={padT+ih*g} y2={padT+ih*g} stroke="#F0F2F5" strokeWidth={1}/>
      ))}
      {TREND_DATA.map((d,i)=>{
        const bh=(d.meetings/maxM)*ih;
        const x=padL+i*bw+bw*0.28;
        return <rect key={i} x={x} y={padT+ih-bh} width={bw*0.44} height={bh} rx={3} fill="#EE0033" opacity={0.9}/>;
      })}
      <polyline
        points={TREND_DATA.map((d,i)=>`${padL+i*bw+bw/2},${padT+ih-(d.hours/maxHr)*ih}`).join(" ")}
        fill="none" stroke="#2D6CDF" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
      {TREND_DATA.map((d,i)=>(
        <circle key={i} cx={padL+i*bw+bw/2} cy={padT+ih-(d.hours/maxHr)*ih} r={3.5} fill="#fff" stroke="#2D6CDF" strokeWidth={2}/>
      ))}
      {TREND_DATA.map((d,i)=>(
        <text key={i} x={padL+i*bw+bw/2} y={H-8} textAnchor="middle" fontSize={11} fill="#98A0AF">{d.m}</text>
      ))}
    </svg>
  );
}

const total = HEADCOUNT.reduce((s,h)=>s+h.count,0);
function buildDonut(){
  let pct = 0;
  return HEADCOUNT.map(h=>{ const deg=(h.count/total)*360; const s=pct; pct+=deg; return {...h,from:s,to:pct}; });
}

export default function DashboardPage() {
  const donutSegs = buildDonut();
  const gradient = donutSegs.map(s=>`${s.color} ${s.from.toFixed(2)}deg ${s.to.toFixed(2)}deg`).join(", ");

  return (
    <div className="flex flex-col gap-5">
      {/* Global filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-[14px] text-tx-light">Tổng quan sử dụng hệ thống</p>
        <div className="flex gap-2.5">
          <Select defaultValue="Tháng 6">
            <SelectTrigger className="w-[120px] h-9 text-[13px]"><SelectValue/></SelectTrigger>
            <SelectContent>{MONTHS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select defaultValue="2026">
            <SelectTrigger className="w-[90px] h-9 text-[13px]"><SelectValue/></SelectTrigger>
            <SelectContent>{YEARS.map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {KPIS.map(k=>(
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-tx-light font-medium">{k.label}</p>
                <div className={cn("w-[34px] h-[34px] rounded-[8px] flex items-center justify-center", k.iconBg)}>
                  <k.icon size={17}/>
                </div>
              </div>
              <p className="text-[28px] font-bold mt-3">{k.value}</p>
              <p className={cn("text-[12px] mt-1.5", k.up ? "text-ok" : "text-warn-dark")}>{k.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Phân tích xu hướng</CardTitle>
              <CardDescription className="mt-1">Số cuộc họp &amp; thời lượng theo 12 tháng năm 2026</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-[12px] text-tx-light">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-brand inline-block"/>Số cuộc họp</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 h-[3px] rounded bg-info inline-block"/>Thời lượng (giờ)</span>
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="h-8 w-auto text-[12px] gap-1.5 min-w-[140px]"><SelectValue placeholder="Tất cả phòng ban"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  <SelectItem value="kt">Phòng Kỹ thuật</SelectItem>
                  <SelectItem value="kd">Phòng Kinh doanh</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-5">
          <div className="h-[240px]"><TrendChart /></div>
        </CardContent>
      </Card>

      {/* Bottom 2 charts */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top 5 depts */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 phòng ban</CardTitle>
            <CardDescription>Số cuộc họp nhiều nhất trong kỳ</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {TOP_DEPTS.map(t=>(
              <div key={t.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-medium">{t.name}</span>
                  <span className="text-[13px] font-semibold text-tx-light">{t.count}</span>
                </div>
                <div className="h-2 rounded-full bg-[#F0F2F5] overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${(t.count/MAX_COUNT)*100}%`, background:t.color}}/>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Headcount donut */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bổ nhân sự</CardTitle>
            <CardDescription>Theo phòng ban · tổng {total} nhân sự</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="relative w-[150px] h-[150px] flex-none">
                <div className="w-full h-full rounded-full" style={{background:`conic-gradient(${gradient})`}}/>
                <div className="absolute inset-[30px] bg-white rounded-full flex flex-col items-center justify-center">
                  <span className="text-[24px] font-bold leading-none">{total}</span>
                  <span className="text-[11px] text-tx-muted mt-0.5">nhân sự</span>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {HEADCOUNT.map(h=>(
                  <div key={h.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{background:h.color}}/>
                    <span className="text-[12px] flex-1 truncate">{h.name}</span>
                    <span className="text-[12px] font-semibold">{h.count}</span>
                    <span className="text-[11px] text-tx-muted w-9 text-right">{(h.count/total*100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
