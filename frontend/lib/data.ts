export const SPEAKER_COLORS = ["#2D6CDF","#2E9E5B","#8B5CF6","#E8A23D","#0EA5A5","#D6336C"];

export const WAVE_BARS = Array.from({length:56},(_,i)=>0.25+Math.abs(Math.sin(i*0.7))*0.7);

export const TREND_DATA = [
  {m:"T1",meetings:8,hours:18},{m:"T2",meetings:11,hours:24},{m:"T3",meetings:9,hours:21},
  {m:"T4",meetings:14,hours:33},{m:"T5",meetings:12,hours:28},{m:"T6",meetings:18,hours:41},
  {m:"T7",meetings:15,hours:36},{m:"T8",meetings:10,hours:22},{m:"T9",meetings:13,hours:31},
  {m:"T10",meetings:16,hours:38},{m:"T11",meetings:14,hours:30},{m:"T12",meetings:12,hours:27},
];

export const HEADCOUNT = [
  {name:"Phòng Kỹ thuật",  count:28, color:"#EE0033"},
  {name:"Phòng Kinh doanh",count:19, color:"#2D6CDF"},
  {name:"Phòng CSKH",      count:14, color:"#2E9E5B"},
  {name:"Phòng Marketing", count:9,  color:"#E8A23D"},
  {name:"Phòng Nhân sự",   count:7,  color:"#8B5CF6"},
  {name:"Phòng Tài chính", count:5,  color:"#0EA5A5"},
  {name:"Phòng Pháp chế",  count:3,  color:"#D6336C"},
  {name:"Ban TGĐ",         count:2,  color:"#64748B"},
];
