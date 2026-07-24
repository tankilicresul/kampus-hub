import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { Send, MessageSquare, Reply, X, RefreshCw, Smile } from 'lucide-react';

interface Message {
  id: string;
  workspace_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
  reply_to?: { content: string; profile?: { full_name: string | null } } | null;
}

export const MessagesScreen: React.FC = () => {
  const { activeWorkspace, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadMessages = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_messages')
        .select(`
          *,
          profile:profiles(full_name, avatar_url),
          reply_to:reply_to_id(content, profile:user_id(full_name))
        `)
        .eq('workspace_id', activeWorkspace.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      setMessages((data as unknown as Message[]) || []);
    } catch (err) {
      console.error('Load messages failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!activeWorkspace?.id) return;
    const channel = supabase
      .channel(`ws-messages-${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_messages',
          filter: `workspace_id=eq.${activeWorkspace.id}`,
        },
        () => { loadMessages(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeWorkspace?.id, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim() || !activeWorkspace?.id || !user?.id) return;
    setSending(true);
    try {
      const { error } = await supabase.from('workspace_messages').insert({
        workspace_id: activeWorkspace.id,
        user_id: user.id,
        content: content.trim(),
        reply_to_id: replyTo?.id || null,
      });
      if (error) throw error;
      setContent('');
      setReplyTo(null);
    } catch (err) {
      console.error('Send message failed:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Bugün';
    if (d.toDateString() === yesterday.toDateString()) return 'Dün';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const dateLabel = formatDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === dateLabel) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: dateLabel, messages: [msg] });
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-glass)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <MessageSquare size={20} style={{ color: 'var(--accent-color)' }} />
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
            {activeWorkspace?.name || 'Ekip'} Sohbeti
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Tüm ekip üyeleri bu kanalı görüntüleyebilir
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={loadMessages}
          style={{ marginLeft: 'auto', padding: '6px' }}
          title="Yenile"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px' }} />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Smile size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>Henüz mesaj yok</p>
            <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Ekibinizle sohbete başlayın!</p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            {/* Date separator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '16px 0 8px',
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-glass)' }} />
              <span style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 600,
                backgroundColor: 'var(--bg-main)',
                padding: '2px 10px',
                borderRadius: '20px',
                border: '1px solid var(--border-glass)',
              }}>
                {group.date}
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-glass)' }} />
            </div>

            {group.messages.map(msg => {
              const isMine = msg.user_id === user?.id;
              const name = msg.profile?.full_name || 'Kullanıcı';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: isMine ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: '8px',
                    marginBottom: '6px',
                    padding: '0 4px',
                  }}
                >
                  {/* Avatar */}
                  {!isMine && (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-color)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {msg.profile?.avatar_url
                        ? <img src={msg.profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : getInitials(name)
                      }
                    </div>
                  )}

                  {/* Bubble */}
                  <div style={{ maxWidth: '70%' }}>
                    {!isMine && (
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '3px', paddingLeft: '4px' }}>
                        {name}
                      </div>
                    )}
                    {/* Reply preview */}
                    {msg.reply_to && (
                      <div style={{
                        backgroundColor: isMine ? 'rgba(255,255,255,0.15)' : 'var(--bg-surface-accent)',
                        borderLeft: '3px solid var(--accent-color)',
                        padding: '4px 8px',
                        borderRadius: '8px 8px 0 0',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: '-4px',
                      }}>
                        <span style={{ fontWeight: 700 }}>
                          {(msg.reply_to as any)?.profile?.full_name || 'Kullanıcı'}:{' '}
                        </span>
                        {(msg.reply_to as any)?.content?.slice(0, 60)}
                        {((msg.reply_to as any)?.content?.length || 0) > 60 ? '...' : ''}
                      </div>
                    )}
                    <div
                      style={{
                        backgroundColor: isMine ? 'var(--accent-color)' : 'var(--bg-surface)',
                        color: isMine ? 'white' : 'var(--text-primary)',
                        padding: '10px 14px',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        fontSize: '0.88rem',
                        lineHeight: '1.45',
                        border: isMine ? 'none' : '1px solid var(--border-glass)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        position: 'relative',
                      }}
                    >
                      {msg.content}
                      <span style={{
                        display: 'block',
                        fontSize: '0.68rem',
                        opacity: 0.7,
                        marginTop: '4px',
                        textAlign: 'right',
                      }}>
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                    {/* Reply button */}
                    <button
                      onClick={() => setReplyTo(msg)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        float: isMine ? 'left' : 'right',
                      }}
                      title="Yanıtla"
                    >
                      <Reply size={12} /> Yanıtla
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderTop: '1px solid var(--border-glass)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderLeft: '3px solid var(--accent-color)',
        }}>
          <Reply size={14} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <strong>{replyTo.profile?.full_name || 'Kullanıcı'}</strong> mesajına yanıt:{' '}
            {replyTo.content.slice(0, 60)}{replyTo.content.length > 60 ? '...' : ''}
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        padding: '12px 16px',
        borderTop: replyTo ? 'none' : '1px solid var(--border-glass)',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
      }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mesaj yaz... (Enter = gönder, Shift+Enter = yeni satır)"
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            backgroundColor: 'var(--bg-surface-accent)',
            border: '1px solid var(--border-glass)',
            borderRadius: '14px',
            padding: '10px 16px',
            fontSize: '0.88rem',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-family)',
            outline: 'none',
            maxHeight: '120px',
            lineHeight: '1.5',
          }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
          }}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!content.trim() || sending}
          style={{ padding: '10px 16px', borderRadius: '12px', flexShrink: 0 }}
          title="Gönder (Enter)"
        >
          {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};
