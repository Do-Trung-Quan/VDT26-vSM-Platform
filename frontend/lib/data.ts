import type { Meeting, User, Department, TranscriptBlock } from "./types";

export const SPEAKER_COLORS = ["#2D6CDF","#2E9E5B","#8B5CF6","#E8A23D","#0EA5A5","#D6336C"];

export const MEETINGS: Meeting[] = [
  { id:"m1", title:"Họp giao ban kỹ thuật tuần 25", status:"LIVE",       type:"LIVE",   host:"Nguyễn Văn An",  dept:"Phòng Kỹ thuật",   created:"23/06 09:00", locked:false },
  { id:"m2", title:"Review sprint 14 — Module thanh toán", status:"PROCESSING", type:"UPLOAD", host:"Trần Thị Bình",   dept:"Phòng Kỹ thuật",   created:"23/06 08:15", locked:false },
  { id:"m3", title:"Phỏng vấn vị trí Senior Backend",      status:"PROCESSING", type:"UPLOAD", host:"Lê Minh Châu",    dept:"Phòng Nhân sự",    created:"22/06 16:40", locked:false },
  { id:"m4", title:"Chốt phương án ngân sách Q3/2026",     status:"COMPLETED",  type:"LIVE",   host:"Phạm Quốc Dũng", dept:"Phòng Tài chính",  created:"22/06 14:00", locked:true  },
  { id:"m5", title:"Kickoff dự án nâng cấp hạ tầng Cloud", status:"COMPLETED",  type:"LIVE",   host:"Nguyễn Văn An",  dept:"Phòng Kỹ thuật",   created:"21/06 10:30", locked:false },
  { id:"m6", title:"Đào tạo quy trình chăm sóc khách hàng",status:"COMPLETED",  type:"UPLOAD", host:"Vũ Thị Hà",      dept:"Phòng CSKH",       created:"21/06 09:00", locked:true  },
  { id:"m7", title:"Họp triển khai chiến dịch Marketing tháng 7",status:"COMPLETED",type:"LIVE",host:"Đỗ Hữu Khang",  dept:"Phòng Marketing",  created:"20/06 15:20", locked:false },
  { id:"m8", title:"Rà soát hợp đồng đối tác chiến lược",  status:"COMPLETED",  type:"UPLOAD", host:"Bùi Thanh Lan",  dept:"Phòng Pháp chế",   created:"20/06 11:00", locked:true  },
  { id:"m9", title:"Tổng kết doanh số khu vực miền Bắc",   status:"COMPLETED",  type:"LIVE",   host:"Hoàng Minh Tú",  dept:"Phòng Kinh doanh", created:"19/06 16:00", locked:false },
];

export const USERS: User[] = [
  { id:"u1", name:"Nguyễn Văn An",  email:"nguyen.van.an@viettel.com.vn",  empId:"VT-04821", dept:"Phòng Kỹ thuật",   role:"ADMIN", active:true,  created:"12/01/2026", color:"#EE0033" },
  { id:"u2", name:"Trần Thị Bình",  email:"tran.thi.binh@viettel.com.vn",  empId:"VT-05130", dept:"Phòng Kỹ thuật",   role:"USER",  active:true,  created:"03/02/2026", color:"#2D6CDF" },
  { id:"u3", name:"Lê Minh Châu",   email:"le.minh.chau@viettel.com.vn",   empId:"VT-04477", dept:"Phòng Nhân sự",    role:"USER",  active:true,  created:"21/11/2025", color:"#2E9E5B" },
  { id:"u4", name:"Phạm Quốc Dũng", email:"pham.quoc.dung@viettel.com.vn", empId:"VT-03988", dept:"Phòng Tài chính",  role:"ADMIN", active:true,  created:"08/09/2025", color:"#8B5CF6" },
  { id:"u5", name:"Vũ Thị Hà",      email:"vu.thi.ha@viettel.com.vn",      empId:"VT-05502", dept:"Phòng CSKH",       role:"USER",  active:false, created:"14/03/2026", color:"#E8A23D" },
  { id:"u6", name:"Đỗ Hữu Khang",   email:"do.huu.khang@viettel.com.vn",   empId:"VT-05011", dept:"Phòng Marketing",  role:"USER",  active:true,  created:"27/12/2025", color:"#0EA5A5" },
  { id:"u7", name:"Bùi Thanh Lan",   email:"bui.thanh.lan@viettel.com.vn",  empId:"VT-04203", dept:"Phòng Pháp chế",  role:"USER",  active:true,  created:"19/06/2025", color:"#D6336C" },
  { id:"u8", name:"Hoàng Minh Tú",   email:"hoang.minh.tu@viettel.com.vn",  empId:"VT-05399", dept:"Phòng Kinh doanh",role:"USER",  active:false, created:"02/05/2026", color:"#64748B" },
];

export const DEPARTMENTS: Department[] = [
  { id:"d1", name:"Phòng Kỹ thuật",    address:"Tầng 8, Tòa A, Lô D26, Cầu Giấy", description:"Phát triển & vận hành sản phẩm công nghệ",        userCount:28, deleted:false },
  { id:"d2", name:"Phòng Kinh doanh",  address:"Tầng 6, Tòa A, Lô D26, Cầu Giấy", description:"Phát triển thị trường và khách hàng doanh nghiệp", userCount:19, deleted:false },
  { id:"d3", name:"Phòng CSKH",        address:"Tầng 4, Tòa B, Lô D26, Cầu Giấy", description:"Chăm sóc và hỗ trợ khách hàng",                    userCount:14, deleted:false },
  { id:"d4", name:"Phòng Marketing",   address:"Tầng 5, Tòa A, Lô D26, Cầu Giấy", description:"Truyền thông và phát triển thương hiệu",            userCount:9,  deleted:false },
  { id:"d5", name:"Phòng Nhân sự",     address:"Tầng 3, Tòa B, Lô D26, Cầu Giấy", description:"Quản trị nguồn nhân lực và tuyển dụng",             userCount:7,  deleted:false },
  { id:"d6", name:"Phòng R&D (cũ)",   address:"Tầng 9, Tòa A, Lô D26, Cầu Giấy", description:"Đã sáp nhập vào Phòng Kỹ thuật",                    userCount:0,  deleted:true  },
];

export const TRANSCRIPT: TranscriptBlock[] = [
  { seq:1, speaker:"Người nói 1", speakerIndex:0, text:"Xin chào mọi người, chúng ta bắt đầu cuộc họp giao ban kỹ thuật tuần 25. Hôm nay có ba nội dung chính cần trao đổi.", time:"00:03" },
  { seq:2, speaker:"Người nói 2", speakerIndex:1, text:"Vâng anh. Về module thanh toán, team đã hoàn thành tích hợp cổng VNPay và đang chạy thử nghiệm trên môi trường staging.", time:"00:21" },
  { seq:3, speaker:"Người nói 1", speakerIndex:0, text:"Tốt. Tỷ lệ giao dịch thành công trong test hiện tại là bao nhiêu phần trăm?", time:"00:38" },
  { seq:4, speaker:"Người nói 2", speakerIndex:1, text:"Khoảng 98.6%. Các trường hợp lỗi còn lại chủ yếu do timeout phía đối tác, chúng tôi đã thêm cơ chế retry.", time:"00:52" },
  { seq:5, speaker:"Người nói 3", speakerIndex:2, text:"Cho mình bổ sung về phần hạ tầng. Chúng ta cần nâng cấp Redis cluster trước khi lên production để đảm bảo chịu tải.", time:"01:14" },
  { seq:6, speaker:"Người nói 1", speakerIndex:0, text:"Đồng ý. Khang lập kế hoạch nâng cấp và gửi lại trong tuần này nhé. Mục tiêu là sẵn sàng trước ngày 30.", time:"01:33" },
  { seq:7, speaker:"Người nói 3", speakerIndex:2, text:"Mình sẽ chuẩn bị tài liệu và lịch triển khai cụ thể, dự kiến downtime tối đa 15 phút vào khung giờ thấp điểm.", time:"01:49" },
  { seq:8, speaker:"Người nói 2", speakerIndex:1, text:"Một điểm nữa, chúng ta nên bổ sung giám sát cảnh báo cho các giao dịch thất bại liên tiếp.", time:"02:07" },
];

export const SUMMARY = `Cuộc họp giao ban kỹ thuật tuần 25 tập trung vào ba nội dung chính:\n\n• Module thanh toán: hoàn thành tích hợp cổng VNPay, đang thử nghiệm trên staging với tỷ lệ giao dịch thành công 98.6%. Lỗi còn lại chủ yếu do timeout đối tác, đã bổ sung cơ chế retry.\n\n• Hạ tầng: cần nâng cấp Redis cluster trước khi lên production. Anh Khang phụ trách lập kế hoạch, mục tiêu sẵn sàng trước ngày 30, downtime tối đa 15 phút vào khung giờ thấp điểm.\n\n• Giám sát: thống nhất bổ sung cảnh báo cho các giao dịch thất bại liên tiếp.\n\nQuyết định: phê duyệt kế hoạch nâng cấp hạ tầng; giao Phòng Kỹ thuật hoàn tất trước cuối tháng.`;

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
