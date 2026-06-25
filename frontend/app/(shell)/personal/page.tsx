"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Camera, Loader2, Eye, EyeOff } from "lucide-react";
import { usersApi } from "@/lib/api/users";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { User } from "@/lib/types";
import { getInitials, getAvatarColor } from "@/lib/types";

export default function PersonalPage() {
  const { refreshUser } = useAuth();
  const [profile,        setProfile]        = useState<User | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [pwLoading,      setPwLoading]      = useState(false);
  const [avatarLoading,  setAvatarLoading]  = useState(false);
  const [profileError,   setProfileError]   = useState<string | null>(null);
  const [pwError,        setPwError]        = useState<string | null>(null);
  const [pwSuccess,      setPwSuccess]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password form
  const [curPw,  setCurPw]  = useState("");
  const [newPw,  setNewPw]  = useState("");
  const [confPw, setConfPw] = useState("");

  // Eye/EyeOff toggles cho 3 trường mật khẩu
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  useEffect(() => {
    usersApi.getProfile()
      .then(({ data }) => setProfile(data))
      .catch(e => setProfileError(e instanceof ApiError ? e.message : "Tải hồ sơ thất bại"))
      .finally(() => setLoading(false));
  }, []);

  const isPwFormValid = !!curPw && !!newPw && !!confPw && newPw === confPw;

  const handleChangePw = async () => {
    if (!isPwFormValid) return;
    if (newPw !== confPw) { setPwError("Mật khẩu xác nhận không khớp"); return; }
    setPwError(null); setPwLoading(true); setPwSuccess(false);
    try {
      await usersApi.changePassword(curPw, newPw);
      setPwSuccess(true); setCurPw(""); setNewPw(""); setConfPw("");
    } catch (e) {
      if (e instanceof ApiError && e.statusCode === 401) {
        setPwError("Mật khẩu hiện tại không chính xác");
      } else if (e instanceof ApiError && e.statusCode === 400) {
        setPwError(e.message);
      } else {
        setPwError("Đổi mật khẩu thất bại, vui lòng thử lại");
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setAvatarLoading(true);
    try {
      const { data } = await usersApi.updateAvatar(file);
      setProfile(prev => prev ? { ...prev, avatarUrl: data.avatarUrl } : prev);
      // Cập nhật context toàn cục → Header render avatar mới ngay lập tức
      await refreshUser();
    } catch {}
    finally { setAvatarLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-tx-muted">
      <Loader2 size={20} className="animate-spin mr-2" />Đang tải…
    </div>
  );

  if (profileError) return (
    <div className="p-4 rounded-lg bg-brand/5 border border-brand/20 text-sm text-brand max-w-[600px]">{profileError}</div>
  );

  const initials = profile ? getInitials(profile.fullName) : "??";
  const color    = profile ? getAvatarColor(profile.id) : "#64748B";
  const roleName = profile?.role === "ADMIN" ? "Quản trị viên" : "Nhân viên";

  const fields = profile ? [
    { label: "Họ và tên",   value: profile.fullName },
    { label: "Email",       value: profile.email },
    { label: "Employee ID", value: profile.employeeId, mono: true },
    { label: "Phòng ban",   value: profile.departmentName },
    { label: "Vai trò",     value: roleName },
    { label: "Trạng thái",  value: "badge" as const },
  ] : [];

  const PwToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-muted hover:text-tx-dark transition-colors">
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-5 max-w-[940px]">
      {/* Personal info card */}
      <div className="bg-white border border-line rounded-[10px] p-6">
        <h2 className="text-[15px] font-bold">Thông tin cá nhân</h2>
        <p className="text-[13px] text-tx-light mt-1">Thông tin định danh do hệ thống quản lý, chỉ đọc.</p>

        {/* Avatar */}
        <div className="flex items-center gap-4 mt-6 mb-1">
          <div className="relative">
            {/* Hiển thị ảnh nếu đã có avatarUrl, ngược lại hiển thị vòng tròn chữ viết tắt */}
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="avatar"
                className="w-[76px] h-[76px] rounded-full object-cover"
                onError={(e) => {
                  // Nếu load ảnh lỗi, ẩn img và hiển thị fallback (có thể dùng onError)
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div
                className="w-[76px] h-[76px] rounded-full text-white flex items-center justify-center font-semibold text-[26px]"
                style={{ background: color }}
              >
                {initials}
              </div>
            )}
            {avatarLoading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <Button variant="outline" size="sm" className="gap-2"
              onClick={() => fileRef.current?.click()} disabled={avatarLoading}>
              <Camera size={14} /> Đổi ảnh đại diện
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {fields.map(f => (
            <div key={f.label}>
              <p className="text-[12px] text-tx-muted mb-1">{f.label}</p>
              {f.value === "badge" ? (
                <Badge variant={profile?.isActive ? "active" : "inactive"} className="text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-ok flex-none" />
                  {profile?.isActive ? "Active" : "Inactive"}
                </Badge>
              ) : (
                <p className={`text-[14px] font-medium ${"mono" in f && f.mono ? "font-mono" : ""}`}>
                  {f.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-white border border-line rounded-[10px] p-6 self-start">
        <h2 className="text-[15px] font-bold">Đổi mật khẩu</h2>
        <p className="text-[13px] text-tx-light mt-1">Cập nhật mật khẩu định kỳ để bảo mật tài khoản.</p>

        <div className="mt-5 flex flex-col gap-4">
          {pwError   && <div className="p-3 rounded-lg bg-brand/5 border border-brand/20 text-sm text-brand">{pwError}</div>}
          {pwSuccess && <div className="p-3 rounded-lg bg-ok/10 border border-ok/20 text-sm text-ok">Đổi mật khẩu thành công!</div>}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cur-pw">Mật khẩu hiện tại</Label>
            <div className="relative">
              <Input id="cur-pw" type={showCur ? "text" : "password"}
                value={curPw} onChange={e => { setCurPw(e.target.value); setPwError(null); }}
                className="pr-9" />
              <PwToggle show={showCur} onToggle={() => setShowCur(v => !v)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-pw">Mật khẩu mới</Label>
            <div className="relative">
              <Input id="new-pw" type={showNew ? "text" : "password"}
                value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(null); }}
                className="pr-9" />
              <PwToggle show={showNew} onToggle={() => setShowNew(v => !v)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="conf-pw">Xác nhận mật khẩu mới</Label>
            <div className="relative">
              <Input id="conf-pw"
                type={showConf ? "text" : "password"}
                value={confPw}
                onChange={e => { setConfPw(e.target.value); setPwError(null); }}
                className={`pr-9 ${confPw && newPw !== confPw ? "border-brand" : ""}`} />
              <PwToggle show={showConf} onToggle={() => setShowConf(v => !v)} />
            </div>
            {confPw && newPw !== confPw && (
              <p className="text-[12px] text-brand mt-0.5">Mật khẩu xác nhận không khớp</p>
            )}
          </div>

          {/* Disable khi trường trống HOẶC mật khẩu mới không khớp */}
          <Button className="w-full mt-1" onClick={handleChangePw}
            disabled={!isPwFormValid || pwLoading}>
            {pwLoading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
            Đổi mật khẩu
          </Button>
        </div>
      </div>
    </div>
  );
}
