import { useState } from "react";
import { X, Star, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: Props) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const t = {
    title: lang === "id" ? "Masukan untuk Coach Surya" : lang === "zh" ? "给Coach Surya的反馈" : "Feedback for Coach Surya",
    placeholder: lang === "id"
      ? "Tulis masukan, saran, atau keluhan kamu di sini..."
      : lang === "zh"
      ? "在这里写下您的反馈、建议或投诉..."
      : "Write your feedback, suggestions, or complaints here...",
    ratingLabel: lang === "id" ? "Beri Rating (opsional)" : lang === "zh" ? "评分（可选）" : "Rate (optional)",
    submit: lang === "id" ? "Kirim Masukan" : lang === "zh" ? "发送反馈" : "Send Feedback",
    sending: lang === "id" ? "Mengirim..." : lang === "zh" ? "发送中..." : "Sending...",
    success: lang === "id"
      ? "Terima kasih! Coach Surya akan membaca masukanmu."
      : lang === "zh"
      ? "谢谢！Coach Surya会阅读您的反馈。"
      : "Thank you! Coach Surya will read your feedback.",
    empty: lang === "id" ? "Masukan tidak boleh kosong" : lang === "zh" ? "反馈不能为空" : "Feedback cannot be empty",
    error: lang === "id" ? "Gagal mengirim, coba lagi" : lang === "zh" ? "发送失败，请重试" : "Failed to send, try again",
    close: lang === "id" ? "Tutup" : lang === "zh" ? "关闭" : "Close",
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      toast({ title: t.empty, variant: "destructive" });
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      // Try to get latest plan goal
      let planGoal: string | null = null;
      try {
        const { data: plan } = await supabase
          .from("saved_plans")
          .select("program_type")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        planGoal = plan?.program_type ?? null;
      } catch {}

      const { error } = await supabase.from("user_feedback").insert({
        user_id: user.id,
        message: trimmed.slice(0, 500),
        rating: rating > 0 ? rating : null,
        user_email: user.email ?? null,
        plan_goal: planGoal,
      });
      if (error) throw error;
      setSuccess(true);
      setMessage("");
      setRating(0);
    } catch (e) {
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setMessage("");
    setRating(0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md relative"
        style={{
          background: "#111",
          border: "1px solid rgba(0,255,120,0.3)",
          borderRadius: 20,
          padding: 28,
        }}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1"
          aria-label={t.close}
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <>
            <div className="flex justify-center mb-4">
              <MessageSquare size={40} color="#00ff78" />
            </div>
            <p
              className="text-center mb-6"
              style={{ color: "#fff", fontSize: 16, lineHeight: 1.5 }}
            >
              {t.success}
            </p>
            <button
              onClick={handleClose}
              className="w-full"
              style={{
                background: "#00ff78",
                color: "#000",
                fontWeight: 700,
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
              }}
            >
              {t.close}
            </button>
          </>
        ) : (
          <>
            <h2
              className="font-bold mb-4"
              style={{ color: "#fff", fontSize: 18, lineHeight: 1.3 }}
            >
              {t.title}
            </h2>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder={t.placeholder}
              maxLength={500}
              rows={5}
              className="w-full mb-2 p-3 rounded-lg bg-background/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <div className="text-right text-xs text-muted-foreground mb-4">
              {message.length}/500
            </div>

            <div className="mb-5">
              <p className="text-sm text-muted-foreground mb-2">{t.ratingLabel}</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? 0 : n)}
                    className="p-1"
                    aria-label={`${n} stars`}
                  >
                    <Star
                      className="w-7 h-7"
                      fill={n <= rating ? "#00ff78" : "transparent"}
                      color={n <= rating ? "#00ff78" : "rgba(255,255,255,0.4)"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !message.trim()}
              className="w-full disabled:opacity-50"
              style={{
                background: "#00ff78",
                color: "#000",
                fontWeight: 700,
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
              }}
            >
              {submitting ? t.sending : t.submit}
            </button>
          </>
        )}
      </div>
    </div>
  );
}