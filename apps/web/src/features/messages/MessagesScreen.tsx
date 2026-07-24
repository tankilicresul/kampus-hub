import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { Send, MessageSquare, Reply, X, RefreshCw, Smile, Paperclip, Camera, Mic } from 'lucide-react';


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

const getAvatarGradient = (userId: string) => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Pink
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', // Blue
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Peach
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', // Gold/Orange
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', // Mint/Blue
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', // Lavender
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', // Purple/Blue
    'linear-gradient(135deg, #abecd6 0%, #fbed96 100%)', // Yellow/Teal
  ];
  return gradients[hash % gradients.length];
};

export const MessagesScreen: React.FC = () => {
  const { activeWorkspace, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
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
          profile:profiles!workspace_messages_user_id_fkey(full_name, avatar_url),
          reply_to:reply_to_id(content, profile:profiles!workspace_messages_user_id_fkey(full_name))
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
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
        background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(255, 255, 255, 0.95) 100%)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(183,1,22,0.1) 0%, rgba(183,1,22,0.04) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(183,1,22,0.15)',
          color: 'var(--accent-color)',
          flexShrink: 0,
        }}>
          <MessageSquare size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeWorkspace?.name || 'Ekip'} Sohbeti
            </span>
            {messages.length > 0 && (
              <span style={{
                fontSize: '0.68rem',
                backgroundColor: 'rgba(183,1,22,0.08)',
                color: 'var(--accent-color)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 700,
                border: '1px solid rgba(183,1,22,0.12)'
              }}>
                {messages.length} mesaj
              </span>
            )}
          </h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Tüm ekip üyeleri bu kanalı görüntüleyebilir
          </p>
        </div>
        <button
          className="btn btn-secondary btn-icon-only"
          onClick={loadMessages}
          disabled={loading}
          style={{ 
            padding: '8px', 
            borderRadius: '50%', 
            width: '36px', 
            height: '36px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'var(--transition-smooth)',
            border: '1px solid var(--border-glass)'
          }}
          title="Yenile"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 4px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {loading && messages.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '40px' }}>
            <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--accent-color)' }} />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            padding: '60px 20px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(183,1,22,0.06) 0%, rgba(183,1,22,0.01) 100%)',
              border: '1px solid rgba(183,1,22,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              color: 'var(--accent-color)',
            }}>
              <MessageSquare size={36} style={{ opacity: 0.6 }} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Ekip Sohbetine Hoş Geldiniz!
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: '280px', lineHeight: '1.5' }}>
              Bu kanal üzerinden çalışma arkadaşlarınızla anlık olarak haberleşebilirsiniz. İlk mesajı yazarak sohbete başlayın!
            </p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '20px 0 12px',
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(226, 232, 240, 0.5)' }} />
              <span style={{
                fontSize: '0.68rem',
                color: 'var(--text-secondary)',
                fontWeight: 700,
                backgroundColor: 'var(--bg-surface-accent)',
                padding: '3px 12px',
                borderRadius: '20px',
                border: '1px solid var(--border-glass)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                {group.date}
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(226, 232, 240, 0.5)' }} />
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
                    marginBottom: '12px',
                    padding: '0 4px',
                  }}
                >
                  {!isMine && (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: getAvatarGradient(msg.user_id),
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      flexShrink: 0,
                      boxShadow: 'var(--shadow-sm)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-glass)',
                    }}>
                      {msg.profile?.avatar_url
                        ? <img src={msg.profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : getInitials(name)
                      }
                    </div>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '72%' 
                  }}>
                    {!isMine && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.74rem', 
                        fontWeight: 600, 
                        color: 'var(--text-secondary)', 
                        marginBottom: '4px', 
                        paddingLeft: '6px' 
                      }}>
                        <span>{name}</span>
                        <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    )}

                    <div style={{ position: 'relative', width: '100%' }}>
                      <div
                        style={{
                          background: isMine 
                            ? 'linear-gradient(135deg, var(--accent-color) 0%, #d81b24 100%)' 
                            : 'var(--bg-surface)',
                          color: isMine ? 'white' : 'var(--text-primary)',
                          padding: '10px 14px',
                          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          fontSize: '0.88rem',
                          lineHeight: '1.45',
                          border: isMine ? 'none' : '1px solid var(--border-glass)',
                          boxShadow: isMine ? '0 3px 10px rgba(183, 1, 22, 0.15)' : 'var(--shadow-sm)',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {msg.reply_to && (
                          <div style={{
                            backgroundColor: isMine ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.03)',
                            borderLeft: `3px solid ${isMine ? 'rgba(255, 255, 255, 0.6)' : 'var(--accent-color)'}`,
                            padding: '6px 10px',
                            borderRadius: '8px 8px 4px 4px',
                            fontSize: '0.75rem',
                            color: isMine ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)',
                            marginBottom: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}>
                            <div style={{ fontWeight: 700, fontSize: '0.7rem', color: isMine ? '#fff' : 'var(--accent-color)' }}>
                              {(msg.reply_to as any)?.profile?.full_name || 'Kullanıcı'}
                            </div>
                            <div style={{ 
                              textOverflow: 'ellipsis', 
                              overflow: 'hidden', 
                              whiteSpace: 'nowrap',
                              opacity: 0.95 
                            }}>
                              {(msg.reply_to as any)?.content}
                            </div>
                          </div>
                        )}

                        <div>{msg.content}</div>

                        {isMine && (
                          <span style={{
                            display: 'block',
                            fontSize: '0.64rem',
                            opacity: 0.65,
                            marginTop: '4px',
                            textAlign: 'right',
                          }}>
                            {formatTime(msg.created_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: isMine ? 'flex-end' : 'flex-start',
                      width: '100%',
                      marginTop: '2px', 
                      padding: '0 4px' 
                    }}>
                      <button
                        onClick={() => setReplyTo(msg)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 6px',
                          borderRadius: '8px',
                          transition: 'var(--transition-smooth)',
                        }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.color = 'var(--accent-color)'; 
                          e.currentTarget.style.backgroundColor = 'rgba(183, 1, 22, 0.05)'; 
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.color = 'var(--text-muted)'; 
                          e.currentTarget.style.backgroundColor = 'transparent'; 
                        }}
                      >
                        <Reply size={11} />
                        <span>Yanıtla</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div style={{
          backgroundColor: 'var(--bg-surface-accent)',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderLeft: '3px solid var(--accent-color)',
          borderTop: '1px solid var(--border-glass)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: 'rgba(183, 1, 22, 0.1)',
            color: 'var(--accent-color)',
            flexShrink: 0
          }}>
            <Reply size={12} />
          </div>
          <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{replyTo.profile?.full_name || 'Kullanıcı'}</span>
            <span style={{ margin: '0 4px', opacity: 0.5 }}>•</span>
            <span style={{ opacity: 0.85 }}>{replyTo.content}</span>
          </div>
          <button 
            onClick={() => setReplyTo(null)} 
            style={{ 
              background: 'rgba(0,0,0,0.05)', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--text-muted)',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'var(--transition-smooth)'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'; }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* WhatsApp-Style Message Input Area */}
      <div style={{ 
        padding: '10px 14px 14px',
        backgroundColor: 'var(--bg-main)', 
        borderTop: replyTo ? 'none' : '1px solid var(--border-glass)',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
      }}>
        {/* Input Pill Container */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface)',
          border: `1px solid ${isFocused ? 'rgba(0, 168, 132, 0.5)' : 'var(--border-glass)'}`,
          boxShadow: isFocused ? '0 0 0 3px rgba(0, 168, 132, 0.15)' : 'none',
          borderRadius: '24px',
          padding: '2px 14px',
          transition: 'var(--transition-smooth)',
        }}>
          {/* Smiley Icon */}
          <Smile 
            size={22} 
            style={{ color: 'var(--text-muted)', marginRight: '10px', cursor: 'pointer', flexShrink: 0 }} 
            onClick={() => setContent(prev => prev + '😊')}
          />
          
          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Mesaj"
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              backgroundColor: 'transparent',
              border: 'none',
              padding: '10px 0',
              fontSize: '0.92rem',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-family)',
              outline: 'none',
              maxHeight: '120px',
              lineHeight: '1.4',
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
          />

          {/* Paperclip Icon */}
          <Paperclip 
            size={20} 
            style={{ color: 'var(--text-muted)', marginLeft: '10px', cursor: 'pointer', flexShrink: 0, transform: 'rotate(45deg)' }} 
          />

          {/* Camera Icon */}
          <Camera 
            size={20} 
            style={{ color: 'var(--text-muted)', marginLeft: '12px', cursor: 'pointer', flexShrink: 0 }} 
          />
        </div>

        {/* Circular Send/Mic Button */}
        <button
          onClick={handleSend}
          disabled={sending}
          style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '50%', 
            background: '#00a884', 
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0, 168, 132, 0.3)',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          title={content.trim() ? "Gönder" : "Ses kaydet"}
        >
          {sending ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : content.trim() ? (
            <Send size={18} style={{ marginLeft: '2px' }} />
          ) : (
            <Mic size={20} />
          )}
        </button>
      </div>
    </div>
  );
};
