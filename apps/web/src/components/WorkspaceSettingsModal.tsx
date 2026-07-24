/**
 * WorkspaceSettingsModal — Ekip Yönetim Paneli
 *
 * Özellikler:
 *  - Ekip adını değiştir (sadece owner)
 *  - Üye rolünü değiştir (admin/owner)
 *  - Üyeyi ekipten çıkar (admin/owner, kendinizi çıkaramazsınız)
 *  - Ekipten ayrıl (owner dışındaki üyeler)
 *  - Sahipliği devret (sadece owner)
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../context/AuthContext';
import { X, Save, Trash2, LogOut, Crown, ChevronDown, AlertTriangle, Check } from 'lucide-react';

interface Member {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  permission_role: string;
}

interface Props {
  workspaceId: string;
  workspaceName: string;
  currentUserId: string;
  onClose: () => void;
  onWorkspaceUpdated: (newName: string) => void;
  onWorkspaceLeft: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Sahip',
  admin: 'Yönetici',
  manager: 'Müdür',
  member: 'Üye',
  guest: 'Misafir',
};

const ROLE_COLORS: Record<string, string> = {
  owner: '#f59e0b',
  admin: '#ef4444',
  manager: '#8b5cf6',
  member: '#38bdf8',
  guest: '#6b7280',
};

export const WorkspaceSettingsModal: React.FC<Props> = ({
  workspaceId,
  workspaceName,
  currentUserId,
  onClose,
  onWorkspaceUpdated,
  onWorkspaceLeft,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState(workspaceName);
  const [savingName, setSavingName] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null); // user_id
  const [changingRole, setChangingRole] = useState<string | null>(null); // user_id
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteNameInput, setDeleteNameInput] = useState('');

  const myMember = members.find((m) => m.user_id === currentUserId);
  const isOwner = myMember?.permission_role === 'owner';
  const isAdmin = isOwner || myMember?.permission_role === 'admin';

  // ── Üyeleri Yükle ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('workspace_members')
        .select('user_id, permission_role, profiles(full_name, avatar_url)')
        .eq('workspace_id', workspaceId);

      if (data) {
        setMembers(
          data.map((m: any) => ({
            user_id: m.user_id,
            full_name: m.profiles?.full_name || 'İsimsiz',
            avatar_url: m.profiles?.avatar_url || null,
            permission_role: m.permission_role,
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, [workspaceId]);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  // ── Ekip Adını Kaydet ────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!editName.trim() || editName === workspaceName) return;
    setSavingName(true);
    const { error } = await supabase
      .from('workspaces')
      .update({ name: editName.trim() })
      .eq('id', workspaceId);

    if (error) {
      showFeedback('error', 'Ad değiştirilemedi: ' + error.message);
    } else {
      onWorkspaceUpdated(editName.trim());
      showFeedback('success', 'Ekip adı güncellendi ✓');
    }
    setSavingName(false);
  };

  // ── Rol Değiştir ─────────────────────────────────────────────────────────────
  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    const { error } = await supabase
      .from('workspace_members')
      .update({ permission_role: newRole })
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);

    if (error) {
      showFeedback('error', 'Rol değiştirilemedi.');
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.user_id === targetUserId ? { ...m, permission_role: newRole } : m))
      );
      showFeedback('success', 'Rol güncellendi ✓');
    }
    setChangingRole(null);
  };

  // ── Üyeyi Çıkar ──────────────────────────────────────────────────────────────
  const handleRemoveMember = async (targetUserId: string) => {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', targetUserId);

    if (error) {
      showFeedback('error', 'Üye çıkarılamadı: ' + error.message);
    } else {
      setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
      showFeedback('success', 'Üye ekipten çıkarıldı ✓');
    }
    setConfirmRemove(null);
  };

  // ── Sahipliği Devret ──────────────────────────────────────────────────────────
  const handleTransferOwnership = async (targetUserId: string) => {
    const { error } = await supabase.rpc('transfer_workspace_ownership', {
      p_target_workspace_id: workspaceId,
      p_target_member_id: targetUserId,
    });

    if (error) {
      showFeedback('error', 'Sahiplik devredilemedi: ' + error.message);
    } else {
      showFeedback('success', 'Sahiplik devredildi ✓');
      setTransferTarget(null);
      // Rolleri yenile
      setMembers((prev) =>
        prev.map((m) => {
          if (m.user_id === targetUserId) return { ...m, permission_role: 'owner' };
          if (m.user_id === currentUserId) return { ...m, permission_role: 'admin' };
          return m;
        })
      );
    }
  };

  // ── Ekipten Ayrıl ────────────────────────────────────────────────────────────
  const handleLeave = async () => {
    const { error } = await supabase.rpc('leave_current_user_workspace', {
      p_target_workspace_id: workspaceId,
    });

    if (error) {
      showFeedback('error', 'Ayrılma işlemi başarısız: ' + error.message);
      setConfirmLeave(false);
    } else {
      onWorkspaceLeft();
    }
  };

  // ── Ekibi Sil ──────────────────────────────────────────────────────────────
  const handleDeleteWorkspace = async () => {
    if (deleteNameInput.trim() !== workspaceName) {
      showFeedback('error', 'Ekip adı eşleşmiyor. Silme iptal edildi.');
      return;
    }
    const { error } = await supabase.rpc('delete_workspace_as_owner', {
      p_workspace_id: workspaceId,
    });
    if (error) {
      showFeedback('error', 'Ekip silinemedi: ' + error.message);
    } else {
      onWorkspaceLeft(); // parent: başka workspace'e geç veya reload
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="modal-backdrop" style={{ zIndex: 2000 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '480px', width: '92vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Başlık */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⚙️ Ekip Yönetimi</span>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            style={{
              padding: '10px 16px',
              margin: '0 16px 8px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.83rem',
              fontWeight: 600,
              backgroundColor: feedback.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: feedback.type === 'success' ? '#10b981' : '#ef4444',
              border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {feedback.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
            {feedback.msg}
          </div>
        )}

        <div style={{ overflowY: 'auto', padding: '16px', flex: 1 }}>
          {/* ── Ekip Adı ── */}
          {isOwner && (
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Ekip Adı</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  placeholder="Ekip adı"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSaveName}
                  disabled={savingName || !editName.trim() || editName === workspaceName}
                  style={{ padding: '8px 14px', flexShrink: 0 }}
                >
                  <Save size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Üye Listesi ── */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}
            >
              EKİP ÜYELERİ ({members.length})
            </div>

            {loading && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>Yükleniyor...</div>
            )}

            {members.map((member) => {
              const isMe = member.user_id === currentUserId;
              const memberIsOwner = member.permission_role === 'owner';
              const canEditThisMember = isAdmin && !isMe && !memberIsOwner;

              return (
                <div
                  key={member.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '6px',
                    background: isMe ? 'rgba(var(--accent-rgb,183,1,22),0.07)' : 'var(--bg-surface-accent)',
                    border: `1px solid ${isMe ? 'var(--accent-color)' : 'var(--border-glass)'}`,
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: ROLE_COLORS[member.permission_role] || 'var(--bg-card)',
                      backgroundImage: member.avatar_url ? `url(${member.avatar_url})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      color: 'white',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {!member.avatar_url && getInitials(member.full_name || '?')}
                  </div>

                  {/* Ad */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: isMe ? 700 : 500,
                        fontSize: '0.88rem',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {member.full_name}
                      {isMe && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--accent-color)', fontWeight: 700 }}>
                          Sen
                        </span>
                      )}
                      {memberIsOwner && <Crown size={12} style={{ color: '#f59e0b' }} />}
                    </div>

                    {/* Rol — tıklanabilir (admin için) */}
                    {canEditThisMember ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          onClick={() => setChangingRole(changingRole === member.user_id ? null : member.user_id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.73rem',
                            color: ROLE_COLORS[member.permission_role] || 'var(--text-muted)',
                            fontWeight: 600,
                          }}
                        >
                          {ROLE_LABELS[member.permission_role] || member.permission_role}
                          <ChevronDown size={11} />
                        </button>
                        {changingRole === member.user_id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-glass)',
                              borderRadius: 'var(--radius-md)',
                              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                              zIndex: 100,
                              minWidth: '130px',
                              overflow: 'hidden',
                            }}
                          >
                            {['admin', 'manager', 'member', 'guest'].map((role) => (
                              <button
                                key={role}
                                onClick={() => handleRoleChange(member.user_id, role)}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '9px 14px',
                                  background:
                                    member.permission_role === role ? 'var(--bg-surface-accent)' : 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '0.82rem',
                                  color: ROLE_COLORS[role] || 'var(--text-primary)',
                                  fontWeight: member.permission_role === role ? 700 : 500,
                                }}
                              >
                                {ROLE_LABELS[role]}
                                {member.permission_role === role && ' ✓'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.73rem', color: ROLE_COLORS[member.permission_role] || 'var(--text-muted)', fontWeight: 600 }}>
                        {ROLE_LABELS[member.permission_role] || member.permission_role}
                      </div>
                    )}
                  </div>

                  {/* Aksiyon butonları */}
                  {canEditThisMember && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      {/* Sahipliği Devret (sadece owner için) */}
                      {isOwner && (
                        <button
                          className="btn btn-secondary btn-icon-only"
                          style={{ padding: '6px', fontSize: '0.7rem' }}
                          title="Sahipliği Devret"
                          onClick={() => setTransferTarget(member.user_id)}
                        >
                          <Crown size={14} style={{ color: '#f59e0b' }} />
                        </button>
                      )}

                      {/* Çıkar */}
                      {confirmRemove === member.user_id ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn"
                            style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                            onClick={() => handleRemoveMember(member.user_id)}
                          >
                            Evet
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '0.75rem' }}
                            onClick={() => setConfirmRemove(null)}
                          >
                            Hayır
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-secondary btn-icon-only"
                          style={{ padding: '6px' }}
                          title="Ekipten Çıkar"
                          onClick={() => setConfirmRemove(member.user_id)}
                        >
                          <Trash2 size={14} style={{ color: '#ef4444' }} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Alt Aksiyonlar ── */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Sahiplik Devir Onayı */}
          {transferTarget && (
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid #f59e0b',
                marginBottom: '4px',
              }}
            >
              <div style={{ fontSize: '0.83rem', color: '#f59e0b', fontWeight: 700, marginBottom: '8px' }}>
                ⚠️ Sahipliği{' '}
                <strong>{members.find((m) => m.user_id === transferTarget)?.full_name}</strong>'e devret?
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                Bu işlem geri alınamaz. Siz yönetici rolüne geçersiniz.
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn"
                  style={{ padding: '7px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
                  onClick={() => handleTransferOwnership(transferTarget)}
                >
                  Devret
                </button>
                <button className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={() => setTransferTarget(null)}>
                  İptal
                </button>
              </div>
            </div>
          )}

          {/* Ekipten Ayrıl */}
          {!isOwner && (
            confirmLeave ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flex: 1 }}>Ekipten ayrılmak istiyor musunuz?</span>
                <button
                  className="btn"
                  style={{ padding: '7px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}
                  onClick={handleLeave}
                >
                  Ayrıl
                </button>
                <button className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={() => setConfirmLeave(false)}>
                  İptal
                </button>
              </div>
            ) : (
              <button
                className="btn btn-secondary btn-block"
                style={{ justifyContent: 'flex-start', gap: '10px', color: '#ef4444' }}
                onClick={() => setConfirmLeave(true)}
              >
                <LogOut size={15} style={{ color: '#ef4444' }} />
                Ekipten Ayrıl
              </button>
            )
          )}

          {/* ⚠️ EKİBİ SİL — sadece owner için */}
          {isOwner && (
            <div
              style={{
                marginTop: '4px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              {!confirmDelete ? (
                <button
                  className="btn btn-secondary btn-block"
                  style={{ justifyContent: 'flex-start', gap: '10px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)' }}
                  onClick={() => { setConfirmDelete(true); setDeleteNameInput(''); }}
                >
                  <span style={{ fontSize: '1rem' }}>🗑️</span>
                  Ekibi Kalıcı Olarak Sil
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>
                    ⚠️ Bu işlem geri alınamaz!
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Tüm görevler, üyeler ve veriler kalıcı olarak silinir.
                    Onayla mak için ekip adını yaz:
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-surface-accent)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace' }}>
                    {workspaceName}
                  </div>
                  <input
                    className="form-input"
                    placeholder="Ekip adını buraya yaz..."
                    value={deleteNameInput}
                    onChange={(e) => setDeleteNameInput(e.target.value)}
                    autoFocus
                    style={{ borderColor: deleteNameInput === workspaceName ? '#10b981' : undefined }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn"
                      style={{
                        padding: '8px 18px',
                        background: deleteNameInput === workspaceName ? '#ef4444' : '#9ca3af',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: deleteNameInput === workspaceName ? 'pointer' : 'not-allowed',
                        fontWeight: 700,
                        fontSize: '0.83rem',
                        flex: 1,
                      }}
                      onClick={handleDeleteWorkspace}
                      disabled={deleteNameInput !== workspaceName}
                    >
                      Kalıcı Olarak Sil
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.83rem' }}
                      onClick={() => { setConfirmDelete(false); setDeleteNameInput(''); }}
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
