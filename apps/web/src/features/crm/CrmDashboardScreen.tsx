import React, { useState, useEffect } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { Plus, RefreshCw, BarChart3, TrendingUp, Award, User, Phone, Percent, Building2 } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  stage: 'discovered' | 'visit_planned' | 'contacted' | 'agreement_reached' | 'contract_completed' | 'active' | 'rejected';
  authorized_person_name?: string;
  authorized_person_phone?: string;
  commission_rate: number;
}

export const CrmDashboardScreen: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Mobile responsive layout state
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadBusinesses = async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('workspace_id', activeWorkspace.id);

      if (error) throw error;
      setBusinesses(data as Business[]);
    } catch (err) {
      console.error('Fetch CRM businesses failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();
  }, [activeWorkspace]);

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!activeWorkspace) {
      setFormError('Aktif ekip seçilmedi. Lütfen sol menüden bir ekip seçin.');
      return;
    }

    if (!name.trim()) {
      setFormError('İşletme adı gerekli.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Fetch default university_id if exists for active workspace
      let targetUniId: string | null = null;
      try {
        const { data: uniList } = await supabase
          .from('universities')
          .select('id')
          .eq('workspace_id', activeWorkspace.id)
          .limit(1);
        if (uniList && uniList.length > 0) {
          targetUniId = uniList[0].id;
        }
      } catch (_) {
        targetUniId = null;
      }

      const { error } = await supabase.from('businesses').insert({
        workspace_id: activeWorkspace.id,
        university_id: targetUniId,
        name: name.trim(),
        stage: 'discovered',
        authorized_person_name: personName.trim() || null,
        authorized_person_phone: personPhone.trim() || null,
        commission_rate: commissionRate,
      });

      if (error) {
        throw error;
      }

      setShowAddModal(false);
      setName('');
      setPersonName('');
      setPersonPhone('');
      setCommissionRate(10.0);
      await loadBusinesses();
    } catch (err: any) {
      console.error('Create CRM business failed:', err);
      setFormError(err.message || 'İşletme eklenirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStageChange = async (businessId: string, newStage: Business['stage']) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq('id', businessId);

      if (error) throw error;
      await loadBusinesses();
    } catch (err) {
      console.error('Update business stage failed:', err);
    }
  };

  // Metrics calculations
  const totalCount = businesses.length;
  const activeCount = businesses.filter((b) => b.stage === 'active').length;
  
  const wonCount = businesses.filter((b) => 
    ['agreement_reached', 'contract_completed', 'active'].includes(b.stage)
  ).length;
  const winRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

  const stages = [
    { key: 'discovered', title: 'Keşif', color: '#38bdf8' },
    { key: 'visit_planned', title: 'Ziyaret', color: '#a78bfa' },
    { key: 'contacted', title: 'Görüşme', color: '#fbbf24' },
    { key: 'agreement_reached', title: 'Anlaşma', color: '#34d399' },
    { key: 'contract_completed', title: 'Sözleşme', color: '#059669' },
    { key: 'active', title: 'Aktif', color: '#10b981' },
    { key: 'rejected', title: 'Kayıp', color: '#ef4444' },
  ] as const;

  // Filter columns to active one on mobile for extreme compactness
  const activeStages = isMobile 
    ? stages.filter(s => s.key === mobileActiveStage) 
    : stages;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      
      {/* Metrics Header Cards */}
      <div className="crm-header-card">
        <div className="stat-item">
          <BarChart3 size={20} style={{ color: 'var(--accent-color)' }} />
          <span className="stat-value">{totalCount}</span>
          <span className="stat-label">Toplam</span>
        </div>
        <div style={{ height: '32px', width: '1px', backgroundColor: 'var(--border-glass)' }} />
        <div className="stat-item">
          <Award size={20} style={{ color: 'var(--color-success)' }} />
          <span className="stat-value">{activeCount}</span>
          <span className="stat-label">Aktif</span>
        </div>
        <div style={{ height: '32px', width: '1px', backgroundColor: 'var(--border-glass)' }} />
        <div className="stat-item">
          <TrendingUp size={20} style={{ color: 'var(--accent-color)' }} />
          <span className="stat-value">%{winRate}</span>
          <span className="stat-label">Başarı</span>
        </div>
      </div>

      {/* Control bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Müşteri Süreci</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Müşteri ve satış aşamaları.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setFormError(null); setShowAddModal(true); }}>
          <Plus size={18} />
          <span className="btn-text">Ekle</span>
        </button>
      </div>

      {/* Mobile-Only CRM Stage Switcher Tabs */}
      <div className="mobile-stage-selector-tabs">
        {stages.map((stg) => {
          const count = businesses.filter((b) => b.stage === stg.key).length;
          return (
            <button
              key={stg.key}
              className={`mobile-stage-tab ${mobileActiveStage === stg.key ? 'active' : ''}`}
              onClick={() => setMobileActiveStage(stg.key)}
            >
              <span style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: stg.color, 
                borderRadius: '50%',
                display: 'inline-block'
              }} />
              <span>{stg.title}</span>
              <span className="mobile-stage-tab-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* CRM Pipelines Board */}
      {loading ? (
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--accent-color)' }} />
        </div>
      ) : (
        <div className="board-container">
          {activeStages.map((stg) => {
            const stageBusinesses = businesses.filter((b) => b.stage === stg.key);
            return (
              <div key={stg.key} className="board-column" style={{ flex: isMobile ? 1 : 'unset', width: isMobile ? '100%' : '220px' }}>
                <div className="column-header">
                  <div className="column-title-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: stg.color }} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{stg.title}</span>
                  </div>
                  <span className="column-badge">{stageBusinesses.length}</span>
                </div>

                <div className="column-cards" style={{ marginTop: '8px' }}>
                  {stageBusinesses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-md)' }}>
                      Kayıt yok
                    </div>
                  ) : (
                    stageBusinesses.map((biz) => (
                      <div key={biz.id} className="crm-card" style={{ gap: '6px', padding: '12px' }}>
                        <div className="card-title" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={13} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.name}</span>
                        </div>
                        
                        {/* Authorized Person */}
                        {biz.authorized_person_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <User size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.authorized_person_name}</span>
                          </div>
                        )}

                        {/* Interactive phone dial link for mobile calling */}
                        {biz.authorized_person_phone && (
                          <a 
                            href={`tel:${biz.authorized_person_phone}`}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              fontSize: '0.75rem', 
                              color: 'var(--accent-color)', 
                              textDecoration: 'none',
                              fontWeight: 500
                            }}
                          >
                            <Phone size={12} style={{ flexShrink: 0 }} />
                            <span>{biz.authorized_person_phone}</span>
                          </a>
                        )}

                        {/* Commission Rate Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <Percent size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span>Komisyon: <strong style={{ color: 'var(--color-success)' }}>%{biz.commission_rate}</strong></span>
                        </div>

                        {/* Dropdown status update selector */}
                        <select 
                          value={biz.stage}
                          onChange={(e) => handleStageChange(biz.id, e.target.value as any)}
                          style={{ 
                            width: '100%', 
                            marginTop: '6px', 
                            background: 'var(--bg-surface)', 
                            color: 'var(--text-primary)', 
                            border: '1px solid var(--border-glass)', 
                            fontSize: '0.75rem', 
                            padding: '4px 6px', 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            fontFamily: 'var(--font-family)',
                            fontWeight: 500
                          }}
                        >
                          {stages.map((s) => (
                            <option key={s.key} value={s.key}>{s.title}</option>
                          ))}
                        </select>
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
            <div className="modal-header">Yeni İşletme</div>

            {formError && (
              <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateBusiness} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">İşletme Adı</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Kampüs Kafe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Yetkili</label>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Telefon</label>
                <input
                  type="text"
                  placeholder="Örn: 0555..."
                  value={personPhone}
                  onChange={(e) => setPersonPhone(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Komisyon (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                  className="form-input"
                />
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
    </div>
  );
};
