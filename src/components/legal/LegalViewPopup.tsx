import { useState, useEffect, useCallback } from 'react';
import { Pencil, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { UI, TERMS, PRIVACY, LangCode } from './legalContent';
import LegalRenderer from './LegalRenderer';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ADMIN_EMAIL = 'surya.sukmakertha@gmail.com';

interface LegalViewPopupProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: 'terms' | 'privacy';
}

export default function LegalViewPopup({ isOpen, onClose, defaultSection = 'terms' }: LegalViewPopupProps) {
  const { lang: appLang } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const lang: LangCode = appLang;

  const ui = UI[lang];
  const terms = TERMS[lang];
  const privacy = PRIVACY[lang];

  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(defaultSection);
  const [dbContent, setDbContent] = useState<{ text: string; updatedAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const fallbackText = activeTab === 'terms'
    ? termsToPlain(terms.sections)
    : termsToPlain(privacy.sections);

  const loadContent = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setEditing(false);
    try {
      const { data } = await supabase
        .from('app_legal_content' as any)
        .select('content_text, last_updated_at')
        .eq('content_type', activeTab)
        .eq('lang', lang)
        .maybeSingle();
      if (data) {
        setDbContent({ text: (data as any).content_text, updatedAt: (data as any).last_updated_at });
      } else {
        setDbContent(null);
      }
    } catch (e) {
      console.error('[LegalViewPopup] load', e);
      setDbContent(null);
    } finally {
      setLoading(false);
    }
  }, [isOpen, activeTab, lang]);

  useEffect(() => {
    if (isOpen) setActiveTab(defaultSection);
  }, [isOpen, defaultSection]);

  useEffect(() => { loadContent(); }, [loadContent]);

  const handleEdit = () => {
    setDraft(dbContent?.text ?? fallbackText);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_legal_content' as any)
        .upsert({
          content_type: activeTab,
          lang,
          content_text: draft,
          last_updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        } as any, { onConflict: 'content_type,lang' });
      if (error) throw error;
      const successMsg = activeTab === 'terms'
        ? (lang === 'id' ? 'Syarat & Ketentuan berhasil diperbarui' : lang === 'zh' ? '服务条款已更新' : 'Terms of Service updated')
        : (lang === 'id' ? 'Kebijakan Privasi berhasil diperbarui' : lang === 'zh' ? '隐私政策已更新' : 'Privacy Policy updated');
      toast.success(successMsg);
      setEditing(false);
      await loadContent();
    } catch (e: any) {
      console.error('[LegalViewPopup] save', e);
      toast.error(lang === 'id' ? 'Gagal menyimpan perubahan' : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = dbContent?.updatedAt
    ? formatDate(dbContent.updatedAt, lang)
    : (activeTab === 'terms' ? terms.lastUpdated : privacy.lastUpdated);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh', backgroundColor: 'var(--color-card, #1a1f2e)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <span className="text-white font-bold text-base">
                {activeTab === 'terms' ? ui.tabTerms : ui.tabPrivacy}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              ×
            </button>
          </div>

          <div className="flex gap-2">
            {(['terms', 'privacy'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-gray-400'
                }`}
                style={activeTab !== tab ? { backgroundColor: 'rgba(255,255,255,0.07)' } : {}}
              >
                {tab === 'terms' ? ui.tabTerms : ui.tabPrivacy}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex items-start justify-between mb-4 gap-3">
            <p className="text-gray-500 text-xs">{formattedDate}</p>
            {isAdmin && !editing && (
              <button
                onClick={handleEdit}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80"
                style={{ background: 'rgba(255,107,0,0.1)', padding: '4px 10px', borderRadius: 8 }}
              >
                <Pencil size={12} />
                Edit
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : editing ? (
            <div className="space-y-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full text-sm text-gray-200 bg-black/40 rounded-xl p-3 leading-relaxed"
                style={{ minHeight: 400, border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'inherit' }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: 'linear-gradient(90deg, #ff6b00, #ff3d7f)' }}
                >
                  {saving ? '…' : (lang === 'id' ? 'Simpan Perubahan' : lang === 'zh' ? '保存更改' : 'Save Changes')}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-300"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  {lang === 'id' ? 'Batal' : lang === 'zh' ? '取消' : 'Cancel'}
                </button>
              </div>
            </div>
          ) : dbContent ? (
            <pre className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap font-sans">
              {dbContent.text}
            </pre>
          ) : (
            <LegalRenderer sections={activeTab === 'terms' ? terms.sections : privacy.sections} />
          )}
          <div className="h-6" />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-gray-300 font-semibold text-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
          >
            {ui.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string, lang: LangCode): string {
  const d = new Date(iso);
  const monthsId = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const monthsEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (lang === 'id') return `Terakhir diperbarui: ${d.getDate()} ${monthsId[d.getMonth()]} ${d.getFullYear()}`;
  if (lang === 'zh') return `最后更新：${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return `Last updated: ${d.getDate()} ${monthsEn[d.getMonth()]} ${d.getFullYear()}`;
}

function termsToPlain(sections: any[]): string {
  const out: string[] = [];
  for (const s of sections) {
    out.push(s.heading);
    if (s.body) out.push(s.body);
    if (s.items) for (const it of s.items) {
      out.push(`${it.label}: ${it.text}`);
      if (it.bullets) for (const b of it.bullets) out.push(`• ${b}`);
    }
    if (s.bullets) for (const b of s.bullets) out.push(`• ${b}`);
    out.push('');
  }
  return out.join('\n');
}
