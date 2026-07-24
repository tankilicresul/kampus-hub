import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import {
  Plus, RefreshCw, BarChart3, TrendingUp, Award, User, Phone, Percent,
  Building2, X, Calendar, MessageSquare, Users, Trash2, MapPin, Search,
} from 'lucide-react';

interface Business {
  id: string;
  name: string;
  stage: 'discovered' | 'visit_planned' | 'contacted' | 'agreement_reached' | 'contract_completed' | 'active' | 'rejected';
  authorized_person_name?: string;
  authorized_person_phone?: string;
  commission_rate: number;
  university_id?: string;
  next_followup_date?: string;
  meeting_notes?: string;
}

interface BusinessContact {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  is_primary: boolean;
}

interface BusinessNote {
  id: string;
  content: string;
  created_at: string;
  profile?: { full_name: string | null };
}

interface VisitReminder {
  id: string;
  visit_date: string;
  notes?: string;
  is_done: boolean;
}

// ─── Business Detail Modal ────────────────────────────────────────────────────
const BusinessDetailModal: React.FC<{
  business: Business;
  workspaceId: string;
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
  stages: readonly { key: string; title: string; color: string }[];
}> = ({ business, workspaceId, currentUserId, onClose, onRefresh, stages }) => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'notes' | 'visits'>('contacts');
  const [contacts, setContacts] = useState<BusinessContact[]>([]);
  const [notes, setNotes] = useState<BusinessNote[]>([]);
  const [visits, setVisits] = useState<VisitReminder[]>([]);
  const [loading, setLoading] = useState(false);

  // New contact form
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactRole, setNewContactRole] = useState('');

  // New note
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // New visit
  const [newVisitDate, setNewVisitDate] = useState('');
  const [newVisitNotes, setNewVisitNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [cRes, nRes, vRes] = await Promise.all([
      supabase.from('business_contacts').select('*').eq('business_id', business.id).order('is_primary', { ascending: false }),
      supabase.from('business_notes').select('*, profile:user_id(full_name)').eq('business_id', business.id).order('created_at', { ascending: false }),
      supabase.from('visit_reminders').select('*').eq('business_id', business.id).order('visit_date', { ascending: true }),
    ]);
    setContacts((cRes.data as BusinessContact[]) || []);
    setNotes((nRes.data as unknown as BusinessNote[]) || []);
    setVisits((vRes.data as VisitReminder[]) || []);
    setLoading(false);
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;
    await supabase.from('business_contacts').insert({
      business_id: business.id,
      name: newContactName.trim(),
      phone: newContactPhone.trim() || null,
      email: newContactEmail.trim() || null,
      role: newContactRole.trim() || null,
      is_primary: contacts.length === 0,
    });
    setNewContactName(''); setNewContactPhone(''); setNewContactEmail(''); setNewContactRole('');
    load();
    onRefresh();
  };

  const handleDeleteContact = async (id: string) => {
    await supabase.from('business_contacts').delete().eq('id', id);
    load();
    onRefresh();
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    await supabase.from('business_notes').insert({ business_id: business.id, user_id: currentUserId, content: newNote.trim() });
    setNewNote('');
    setSubmittingNote(false);
    load();
    onRefresh();
  };

  const handleDeleteNote = async (id: string) => {
    await supabase.from('business_notes').delete().eq('id', id);
    load();
    onRefresh();
  };

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitDate) return;
    await supabase.from('visit_reminders').insert({
      business_id: business.id,
      workspace_id: workspaceId,
      user_id: currentUserId,
      visit_date: newVisitDate,
      notes: newVisitNotes.trim() || null,
    });
    setNewVisitDate(''); setNewVisitNotes('');
    load();
    onRefresh();
  };

  const handleToggleVisit = async (visit: VisitReminder) => {
    await supabase.from('visit_reminders').update({ is_done: !visit.is_done }).eq('id', visit.id);
    load();
    onRefresh();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '600px', width: '96%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={18} style={{ color: 'var(--accent-color)' }} />
            <span>{business.name}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Stage + commission info row */}
        <div style={{ padding: '0 0 12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '4px 12px', borderRadius: '20px', fontSize: '0.76rem', fontWeight: 700,
            backgroundColor: `${stages.find(s => s.key === business.stage)?.color || '#888'}20`,
            color: stages.find(s => s.key === business.stage)?.color || 'var(--text-secondary)',
            border: `1px solid ${stages.find(s => s.key === business.stage)?.color || 'var(--border-glass)'}40`,
          }}>
            {stages.find(s => s.key === business.stage)?.title || business.stage}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Percent size={12} /> %{business.commission_rate} Komisyon
          </span>
          {business.next_followup_date && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} /> {new Date(business.next_followup_date).toLocaleDateString('tr-TR')}
            </span>
          )}
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-glass)', marginBottom: '12px' }}>
          {[
            { key: 'contacts', label: 'Kişiler', icon: <Users size={13} /> },
            { key: 'notes', label: 'Notlar', icon: <MessageSquare size={13} /> },
            { key: 'visits', label: 'Ziyaret', icon: <MapPin size={13} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                padding: '8px 12px', fontSize: '0.8rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                color: activeTab === tab.key ? 'var(--accent-color)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent-color)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <RefreshCw className="animate-spin" size={20} style={{ color: 'var(--accent-color)' }} />
            </div>
          )}

          {/* Contacts */}
          {activeTab === 'contacts' && !loading && (
            <>
              {contacts.map(c => (
                <div key={c.id} style={{
                  backgroundColor: 'var(--bg-surface-accent)', padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {c.name}
                      {c.is_primary && (
                        <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px', backgroundColor: 'rgba(183,1,22,0.1)', color: 'var(--accent-color)', fontWeight: 700 }}>
                          Birincil
                        </span>
                      )}
                    </div>
                    {c.role && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>{c.role}</div>}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
                      {c.phone && <a href={`tel:${c.phone}`} style={{ fontSize: '0.75rem', color: 'var(--accent-color)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={11} />{c.phone}</a>}
                      {c.email && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.email}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteContact(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {contacts.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>Henüz kişi eklenmedi.</p>}

              {/* Add contact form */}
              <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-glass)', paddingTop: '12px', marginTop: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>+ Yeni Kişi Ekle</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input type="text" required placeholder="Ad Soyad *" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }} />
                  <input type="text" placeholder="Ünvan (Müdür...)" value={newContactRole} onChange={e => setNewContactRole(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }} />
                  <input type="tel" placeholder="Telefon" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }} />
                  <input type="email" placeholder="E-posta" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Kişi Ekle</button>
              </form>
            </>
          )}

          {/* Notes */}
          {activeTab === 'notes' && !loading && (
            <>
              {notes.map(note => (
                <div key={note.id} style={{
                  backgroundColor: 'var(--bg-surface-accent)', padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                    <span><strong>{(note.profile as any)?.full_name || 'Kullanıcı'}</strong> · {new Date(note.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><Trash2 size={12} /></button>
                  </div>
                  <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{note.content}</p>
                </div>
              ))}
              {notes.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>Henüz not eklenmedi.</p>}
              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '8px', borderTop: '1px dashed var(--border-glass)', paddingTop: '12px' }}>
                <textarea
                  placeholder="Not ekle..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="form-input"
                  rows={2}
                  style={{ flex: 1, fontSize: '0.85rem', resize: 'none' }}
                />
                <button type="submit" className="btn btn-primary" disabled={submittingNote || !newNote.trim()} style={{ padding: '8px 14px', alignSelf: 'flex-end' }}>
                  {submittingNote ? <RefreshCw size={14} className="animate-spin" /> : 'Ekle'}
                </button>
              </form>
            </>
          )}

          {/* Visits */}
          {activeTab === 'visits' && !loading && (
            <>
              {visits.map(v => (
                <div key={v.id} style={{
                  backgroundColor: v.is_done ? 'rgba(16,185,129,0.05)' : 'var(--bg-surface-accent)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${v.is_done ? 'rgba(16,185,129,0.2)' : 'var(--border-glass)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: v.is_done ? 'line-through' : 'none', color: v.is_done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      <Calendar size={13} style={{ color: v.is_done ? '#10b981' : 'var(--accent-color)' }} />
                      {new Date(v.visit_date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    {v.notes && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{v.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleToggleVisit(v)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.72rem', flexShrink: 0, color: v.is_done ? '#10b981' : 'var(--text-secondary)' }}
                  >
                    {v.is_done ? '✔ Yapıldı' : 'Tamamla'}
                  </button>
                </div>
              ))}
              {visits.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>Planlanmış ziyaret yok.</p>}
              <form onSubmit={handleAddVisit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-glass)', paddingTop: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>+ Ziyaret Planla</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input type="date" required value={newVisitDate} onChange={e => setNewVisitDate(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }} />
                  <input type="text" placeholder="Notlar (opsiyonel)" value={newVisitNotes} onChange={e => setNewVisitNotes(e.target.value)} className="form-input" style={{ fontSize: '0.82rem' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>Ziyaret Ekle</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main CrmDashboardScreen ──────────────────────────────────────────────────
export const CrmDashboardScreen: React.FC = () => {
  const { activeWorkspace, user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [mobileActiveStage, setMobileActiveStage] = useState<Business['stage']>('discovered');

  // New business form
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [commissionRate, setCommissionRate] = useState(10.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Detail modal
  const [detailBusiness, setDetailBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadBusinesses = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .is('deleted_at', null);
      if (error) throw error;
      setBusinesses(data as Business[]);
    } catch (err) {
      console.error('Fetch CRM businesses failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => { loadBusinesses(); }, [loadBusinesses]);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!activeWorkspace) { setFormError('Aktif ekip seçilmedi.'); return; }
    if (!name.trim()) { setFormError('İşletme adı gerekli.'); return; }
    setIsSubmitting(true);
    try {
      let targetUniId: string | null = null;
      try {
        const { data: uniList } = await supabase.from('universities').select('id').eq('workspace_id', activeWorkspace.id).limit(1);
        if (uniList && uniList.length > 0) targetUniId = uniList[0].id;
      } catch (_) { targetUniId = null; }

      const { error } = await supabase.from('businesses').insert({
        workspace_id: activeWorkspace.id,
        university_id: targetUniId,
        name: name.trim(),
        stage: 'discovered',
        authorized_person_name: personName.trim() || null,
        authorized_person_phone: personPhone.trim() || null,
        commission_rate: commissionRate,
      });
      if (error) throw error;
      setShowAddModal(false);
      setName(''); setPersonName(''); setPersonPhone(''); setCommissionRate(10.0);
      await loadBusinesses();
    } catch (err: any) {
      setFormError(err.message || 'İşletme eklenirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStageChange = async (businessId: string, newStage: Business['stage']) => {
    try {
      await supabase.from('businesses').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', businessId);
      await loadBusinesses();
    } catch (err) {
      console.error('Update business stage failed:', err);
    }
  };

  const filteredBusinesses = businesses.filter(b =>
    !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.authorized_person_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCount = filteredBusinesses.length;
  const activeCount = filteredBusinesses.filter(b => b.stage === 'active').length;
  const wonCount = filteredBusinesses.filter(b => ['agreement_reached', 'contract_completed', 'active'].includes(b.stage)).length;
  const winRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;
  const avgCommission = totalCount > 0 ? (filteredBusinesses.reduce((acc, b) => acc + Number(b.commission_rate), 0) / totalCount).toFixed(1) : '0';

  const stages = [
    { key: 'discovered', title: 'Keşif', color: '#38bdf8' },
    { key: 'visit_planned', title: 'Ziyaret', color: '#a78bfa' },
    { key: 'contacted', title: 'Görüşme', color: '#fbbf24' },
    { key: 'agreement_reached', title: 'Anlaşma', color: '#34d399' },
    { key: 'contract_completed', title: 'Sözleşme', color: '#059669' },
    { key: 'active', title: 'Aktif', color: '#10b981' },
    { key: 'rejected', title: 'Kayıp', color: '#ef4444' },
  ] as const;

  const activeStages = isMobile ? stages.filter(s => s.key === mobileActiveStage) : stages;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>

      {/* Metrics Header Cards */}
      <div className="crm-header-card">
        {[
          { icon: <BarChart3 size={20} style={{ color: 'var(--accent-color)' }} />, value: totalCount, label: 'Toplam' },
          { icon: <Award size={20} style={{ color: 'var(--color-success)' }} />, value: activeCount, label: 'Aktif' },
          { icon: <TrendingUp size={20} style={{ color: 'var(--accent-color)' }} />, value: `%${winRate}`, label: 'Başarı' },
          { icon: <Percent size={20} style={{ color: '#f59e0b' }} />, value: `%${avgCommission}`, label: 'Ort. Kom.' },
        ].map((stat, i) => (
          <React.Fragment key={stat.label}>
            {i > 0 && <div style={{ height: '32px', width: '1px', backgroundColor: 'var(--border-glass)' }} />}
            <div className="stat-item">
              {stat.icon}
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Control bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '140px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="İşletme ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '44px' }}
          />
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(null); setShowAddModal(true); }}>
          <Plus size={18} />
          <span className="btn-text">Ekle</span>
        </button>
      </div>

      {/* Mobile Stage Switcher */}
      <div className="mobile-stage-selector-tabs">
        {stages.map(stg => {
          const count = filteredBusinesses.filter(b => b.stage === stg.key).length;
          return (
            <button
              key={stg.key}
              className={`mobile-stage-tab ${mobileActiveStage === stg.key ? 'active' : ''}`}
              onClick={() => setMobileActiveStage(stg.key)}
            >
              <span style={{ width: '6px', height: '6px', backgroundColor: stg.color, borderRadius: '50%', display: 'inline-block' }} />
              <span>{stg.title}</span>
              <span className="mobile-stage-tab-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* CRM Board */}
      {loading ? (
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : (
        <div className="board-container">
          {activeStages.map(stg => {
            const stageBusinesses = filteredBusinesses.filter(b => b.stage === stg.key);
            return (
              <div key={stg.key} className="board-column" style={{ flex: isMobile ? 1 : 'unset', width: isMobile ? '100%' : '220px' }}>
                <div className="column-header">
                  <div className="column-title-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stg.color }} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{stg.title}</span>
                  </div>
                  <span className="column-badge">{stageBusinesses.length}</span>
                </div>

                <div className="column-cards" style={{ marginTop: '8px' }}>
                  {stageBusinesses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-md)' }}>
                      Kayıt yok
                    </div>
                  ) : (
                    stageBusinesses.map(biz => (
                      <div
                        key={biz.id}
                        className="crm-card"
                        style={{ gap: '6px', padding: '12px', cursor: 'pointer' }}
                        onClick={() => setDetailBusiness(biz)}
                      >
                        <div className="card-title" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={13} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.name}</span>
                        </div>

                        {biz.authorized_person_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <User size={11} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.authorized_person_name}</span>
                          </div>
                        )}
                        {biz.authorized_person_phone && (
                          <a
                            href={`tel:${biz.authorized_person_phone}`}
                            onClick={e => e.stopPropagation()}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--accent-color)', textDecoration: 'none' }}
                          >
                            <Phone size={11} />{biz.authorized_person_phone}
                          </a>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem', color: 'var(--color-success)' }}>
                          <Percent size={11} /> %{biz.commission_rate}
                        </div>

                        <div onClick={e => e.stopPropagation()}>
                          <select
                            value={biz.stage}
                            onChange={e => { e.stopPropagation(); handleStageChange(biz.id, e.target.value as any); }}
                            style={{
                              width: '100%', marginTop: '6px',
                              background: 'var(--bg-surface)', color: 'var(--text-primary)',
                              border: '1px solid var(--border-glass)', fontSize: '0.72rem',
                              padding: '4px 6px', borderRadius: '8px', cursor: 'pointer',
                              fontFamily: 'var(--font-family)', fontWeight: 500,
                            }}
                          >
                            {stages.map(s => <option key={s.key} value={s.key}>{s.title}</option>)}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Business Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Yeni İşletme</span>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {formError && <div className="alert alert-danger" style={{ marginBottom: '12px', fontSize: '0.85rem' }}>{formError}</div>}
            <form onSubmit={handleCreateBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">İşletme Adı *</label>
                <input type="text" required placeholder="Örn: Kampüs Kafe" value={name} onChange={e => setName(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Yetkili Kişi</label>
                <input type="text" placeholder="Örn: Ahmet Yılmaz" value={personName} onChange={e => setPersonName(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Telefon</label>
                <input type="tel" placeholder="0555..." value={personPhone} onChange={e => setPersonPhone(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Komisyon (%)</label>
                <input type="number" step="0.1" min="0" max="100" required value={commissionRate} onChange={e => setCommissionRate(parseFloat(e.target.value))} className="form-input" />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>İptal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Detail Modal */}
      {detailBusiness && (
        <BusinessDetailModal
          business={detailBusiness}
          workspaceId={activeWorkspace?.id || ''}
          currentUserId={user?.id || ''}
          onClose={() => setDetailBusiness(null)}
          onRefresh={loadBusinesses}
          stages={stages}
        />
      )}
    </div>
  );
};
