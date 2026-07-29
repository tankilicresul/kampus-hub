import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, supabase } from '../../context/AuthContext';
import { 
  Send, MessageSquare, Reply, X, RefreshCw, Smile, Paperclip, 
  Users, UserPlus, ChevronLeft
} from 'lucide-react';

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
  
  // Navigation & Tabs
  const [chatTab, setChatTab] = useState<'general' | 'groups' | 'dm'>('general');
  const [isChatOpen, setIsChatOpen] = useState(false); // Mobile responsive back/forth
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Data States
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Rooms & Members
  const [rooms, setRooms] = useState<any[]>([]); // Custom chat groups
  const [dmRooms, setDmRooms] = useState<any[]>([]); // DMs
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  
  // Modals & Forms
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load active workspace members
  const loadWorkspaceMembers = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('user_id, permission_role, profiles(full_name, avatar_url)')
        .eq('workspace_id', activeWorkspace.id);
        
      if (error) throw error;
      if (data) {
        setWorkspaceMembers(data.map((m: any) => ({
          user_id: m.user_id,
          full_name: m.profiles?.full_name || 'İsimsiz Üye',
          avatar_url: m.profiles?.avatar_url || null,
          role: m.permission_role,
        })));
      }
    } catch (err) {
      console.error('Load workspace members failed:', err);
    }
  }, [activeWorkspace?.id]);

  // Load chat rooms (groups & DMs)
  const loadRooms = useCallback(async () => {
    if (!activeWorkspace?.id || !user?.id) return;
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          members:chat_room_members(user_id, status, profile:profiles(full_name, avatar_url))
        `)
        .eq('workspace_id', activeWorkspace.id);
        
      if (error) throw error;
      
      const allRooms = data || [];
      
      // Rooms user is actively a member of
      const joinedRooms = allRooms.filter((r: any) => 
        r.members.some((m: any) => m.user_id === user.id && m.status === 'joined')
      );
      
      setRooms(joinedRooms.filter((r: any) => !r.is_dm));
      setDmRooms(joinedRooms.filter((r: any) => r.is_dm));
      
      // Room invitations user has pending
      const invitedRooms = allRooms.filter((r: any) => 
        r.members.some((m: any) => m.user_id === user.id && m.status === 'invited')
      );
      setPendingInvites(invitedRooms);
      
    } catch (err) {
      console.error('Load rooms failed:', err);
    }
  }, [activeWorkspace?.id, user?.id]);

  // Load messages for general chat or selected room
  const loadMessages = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      let query = supabase
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

      if (chatTab === 'general') {
        query = query.is('room_id', null);
      } else {
        if (!selectedRoom) {
          setMessages([]);
          setLoading(false);
          return;
        }
        query = query.eq('room_id', selectedRoom.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMessages((data as unknown as Message[]) || []);
    } catch (err) {
      console.error('Load messages failed:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, chatTab, selectedRoom]);

  // Handle Tab Switch
  const handleTabSwitch = (tab: 'general' | 'groups' | 'dm') => {
    setChatTab(tab);
    setSelectedRoom(null);
    setIsChatOpen(false);
    setReplyTo(null);
    setContent('');
  };

  useEffect(() => {
    loadWorkspaceMembers();
    loadRooms();
  }, [activeWorkspace?.id, loadWorkspaceMembers, loadRooms]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time message subscription
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
        (payload: any) => {
          const newMsg = payload.new;
          if (chatTab === 'general' && !newMsg.room_id) {
            loadMessages();
          } else if (chatTab !== 'general' && selectedRoom && newMsg.room_id === selectedRoom.id) {
            loadMessages();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeWorkspace?.id, chatTab, selectedRoom, loadMessages]);

  // Real-time rooms / membership subscription
  useEffect(() => {
    if (!activeWorkspace?.id || !user?.id) return;
    const channel = supabase
      .channel(`ws-rooms-${activeWorkspace.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_room_members' },
        () => { loadRooms(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_rooms', filter: `workspace_id=eq.${activeWorkspace.id}` },
        () => { loadRooms(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeWorkspace?.id, user?.id, loadRooms]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Message
  const handleSend = async () => {
    if (!content.trim() || !activeWorkspace?.id || !user?.id) return;
    setSending(true);
    try {
      const { error } = await supabase.from('workspace_messages').insert({
        workspace_id: activeWorkspace.id,
        user_id: user.id,
        content: content.trim(),
        reply_to_id: replyTo?.id || null,
        room_id: chatTab === 'general' ? null : (selectedRoom?.id || null)
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

  // Create Group Chat
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !activeWorkspace?.id || !user?.id) return;
    try {
      const { data: newRoom, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          workspace_id: activeWorkspace.id,
          name: newGroupName.trim(),
          created_by: user.id,
          is_dm: false
        })
        .select()
        .single();
        
      if (roomError) throw roomError;
      
      const creatorInvite = { room_id: newRoom.id, user_id: user.id, status: 'joined' };
      const otherInvites = selectedMembers.map(uid => ({
        room_id: newRoom.id,
        user_id: uid,
        status: 'invited'
      }));
      
      const { error: membersError } = await supabase
        .from('chat_room_members')
        .insert([creatorInvite, ...otherInvites]);
        
      if (membersError) throw membersError;
      
      setNewGroupName('');
      setSelectedMembers([]);
      setShowCreateGroupModal(false);
      await loadRooms();
      setSelectedRoom(newRoom);
      setIsChatOpen(true);
    } catch (err) {
      console.error('Create group failed:', err);
    }
  };

  // Start or Join Direct Message (DM)
  const handleStartDM = async (otherUserId: string) => {
    if (!activeWorkspace?.id || !user?.id) return;
    try {
      // Look if DM exists
      const { data: existingDMs, error: dmError } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          members:chat_room_members(user_id)
        `)
        .eq('workspace_id', activeWorkspace.id)
        .eq('is_dm', true);
        
      if (dmError) throw dmError;
      
      const foundDM = existingDMs?.find((r: any) => 
        r.members.length === 2 && 
        r.members.some((m: any) => m.user_id === user.id) &&
        r.members.some((m: any) => m.user_id === otherUserId)
      );
      
      if (foundDM) {
        setSelectedRoom(foundDM);
        setIsChatOpen(true);
        return;
      }
      
      // Create new DM
      const { data: newRoom, error: roomCreateError } = await supabase
        .from('chat_rooms')
        .insert({
          workspace_id: activeWorkspace.id,
          name: `DM-${user.id}-${otherUserId}`,
          created_by: user.id,
          is_dm: true
        })
        .select()
        .single();
        
      if (roomCreateError) throw roomCreateError;
      
      const { error: membersError } = await supabase
        .from('chat_room_members')
        .insert([
          { room_id: newRoom.id, user_id: user.id, status: 'joined' },
          { room_id: newRoom.id, user_id: otherUserId, status: 'joined' }
        ]);
        
      if (membersError) throw membersError;
      
      await loadRooms();
      setSelectedRoom({
        ...newRoom,
        members: [
          { user_id: user.id, status: 'joined' },
          { user_id: otherUserId, status: 'joined' }
        ]
      });
      setIsChatOpen(true);
    } catch (err) {
      console.error('Start DM failed:', err);
    }
  };

  // Accept/Decline Group Invites
  const handleAcceptInvite = async (roomId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('chat_room_members')
        .update({ status: 'joined' })
        .eq('room_id', roomId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      await loadRooms();
    } catch (err) {
      console.error('Accept invite failed:', err);
    }
  };

  const handleDeclineInvite = async (roomId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('chat_room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      await loadRooms();
    } catch (err) {
      console.error('Decline invite failed:', err);
    }
  };

  // Helper formatting functions
  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
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

  // Render DM Name & Avatar dynamically
  const getDMName = (room: any) => {
    const otherMember = room.members?.find((m: any) => m.user_id !== user?.id);
    return otherMember?.profile?.full_name || 'Birebir Sohbet';
  };

  const getDMAvatar = (room: any) => {
    const otherMember = room.members?.find((m: any) => m.user_id !== user?.id);
    return otherMember?.profile?.avatar_url || null;
  };

  const getDMUserId = (room: any) => {
    const otherMember = room.members?.find((m: any) => m.user_id !== user?.id);
    return otherMember?.user_id || '';
  };

  const toggleSelectMember = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach(msg => {
    const dateLabel = formatDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateLabel) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateLabel, messages: [msg] });
    }
  });

  return (
    <div className="messages-layout-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      
      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        background: 'var(--bg-surface-accent)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid var(--border-glass)',
      }}>
        {[
          { id: 'general', label: 'Genel Sohbet' },
          { id: 'groups', label: 'Özel Gruplar' },
          { id: 'dm', label: 'Birebir (DM)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabSwitch(tab.id as any)}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: chatTab === tab.id ? 'var(--bg-card)' : 'transparent',
              color: chatTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
              boxShadow: chatTab === tab.id ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        border: '1px solid var(--border-glass)', 
        borderRadius: '16px', 
        overflow: 'hidden',
        background: 'var(--bg-card)',
        minHeight: 0
      }}>
        
        {/* LEFT PANE - Navigation Lists (Visible when chat is closed on mobile, or always on desktop) */}
        <div style={{
          width: chatTab === 'general' ? '0' : '300px',
          display: chatTab === 'general' ? 'none' : (isDesktop ? 'flex' : (isChatOpen ? 'none' : 'flex')),
          flexDirection: 'column',
          borderRight: '1px solid var(--border-glass)',
          background: 'var(--bg-surface-accent)',
          flexShrink: 0,
        }} className="chat-left-pane">
          
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {chatTab === 'groups' ? 'Grup Sohbetleri' : 'Birebir Sohbetler'}
            </span>
            {chatTab === 'groups' && (
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="btn btn-primary"
                style={{ padding: '5px 10px', fontSize: '0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <UserPlus size={13} />
                <span>Grup Kur</span>
              </button>
            )}
          </div>

          {/* List Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            
            {/* Tab 2: Group Invitations */}
            {chatTab === 'groups' && pendingInvites.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0 8px' }}>DAVETLER</div>
                {pendingInvites.map(room => (
                  <div key={room.id} style={{
                    padding: '10px', background: 'rgba(var(--accent-rgb, 183,1,22), 0.05)', 
                    border: '1px solid rgba(var(--accent-rgb, 183,1,22), 0.15)', borderRadius: '10px',
                    display: 'flex', flexDirection: 'column', gap: '6px'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{room.name}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        onClick={() => handleAcceptInvite(room.id)}
                        className="btn btn-primary" 
                        style={{ flex: 1, padding: '4px', fontSize: '0.72rem', borderRadius: '6px' }}
                      >
                        Katıl
                      </button>
                      <button 
                        onClick={() => handleDeclineInvite(room.id)}
                        className="btn btn-secondary" 
                        style={{ flex: 1, padding: '4px', fontSize: '0.72rem', borderRadius: '6px' }}
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Joined Groups List */}
            {chatTab === 'groups' && (
              <>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0 8px' }}>GRUPLARIM</div>
                {rooms.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                    Katıldığınız grup yok.
                  </div>
                ) : (
                  rooms.map(room => (
                    <div
                      key={room.id}
                      onClick={() => { setSelectedRoom(room); setIsChatOpen(true); }}
                      style={{
                        padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                        background: selectedRoom?.id === room.id ? 'rgba(var(--accent-rgb, 183,1,22), 0.08)' : 'transparent',
                        border: `1px solid ${selectedRoom?.id === room.id ? 'rgba(var(--accent-rgb, 183,1,22), 0.15)' : 'transparent'}`,
                        display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => { if (selectedRoom?.id !== room.id) e.currentTarget.style.backgroundColor = 'var(--bg-surface-accent)'; }}
                      onMouseLeave={(e) => { if (selectedRoom?.id !== room.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(183,1,22,0.15) 0%, rgba(183,1,22,0.05) 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)'
                      }}>
                        <Users size={16} />
                      </div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.name}
                      </span>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Tab 3: DMs Workspace Members List */}
            {chatTab === 'dm' && (
              <>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0 8px' }}>EKİP ÜYELERİ</div>
                {workspaceMembers.filter(m => m.user_id !== user?.id).length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                    Ekipte başka üye yok.
                  </div>
                ) : (
                  workspaceMembers.filter(m => m.user_id !== user?.id).map(member => {
                    const isSelected = selectedRoom && dmRooms.some(r => r.id === selectedRoom.id && r.members.some((mb: any) => mb.user_id === member.user_id));
                    return (
                      <div
                        key={member.user_id}
                        onClick={() => handleStartDM(member.user_id)}
                        style={{
                          padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                          background: isSelected ? 'rgba(var(--accent-rgb, 183,1,22), 0.08)' : 'transparent',
                          border: `1px solid ${isSelected ? 'rgba(var(--accent-rgb, 183,1,22), 0.15)' : 'transparent'}`,
                          display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-surface-accent)'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: getAvatarGradient(member.user_id), color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 800, overflow: 'hidden'
                        }}>
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            getInitials(member.full_name)
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {member.full_name}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {member.role === 'owner' ? 'Kurucu' : member.role === 'admin' ? 'Yönetici' : 'Üye'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

          </div>
        </div>

        {/* RIGHT PANE - Chat Window (Visible when chat is open on mobile, or always on desktop) */}
        <div style={{
          flex: 1,
          display: chatTab === 'general' ? 'flex' : (isDesktop ? 'flex' : (isChatOpen ? 'flex' : 'none')),
          flexDirection: 'column',
          background: 'var(--bg-card)',
          minWidth: 0,
        }} className="chat-right-pane">
          
          {chatTab !== 'general' && !selectedRoom ? (
            /* No room selected screen */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px', textAlign: 'center' }}>
              <div style={{
                width: '70px', height: '70px', borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(183,1,22,0.06) 0%, rgba(183,1,22,0.01) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '16px'
              }}>
                <MessageSquare size={30} style={{ opacity: 0.6 }} />
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                {chatTab === 'groups' ? 'Grup Sohbeti Seçin' : 'Kişi Seçin'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '240px', lineHeight: '1.4' }}>
                {chatTab === 'groups' 
                  ? 'Mesajlaşmaya başlamak için sol listeden bir gruba tıklayın veya yeni bir grup kurun.'
                  : 'Ekip üyelerinden birine tıklayarak birebir özel sohbeti başlatın.'
                }
              </p>
            </div>
          ) : (
            /* Chat window active */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(255, 255, 255, 0.95) 100%)',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backdropFilter: 'blur(10px)',
              }}>
                {chatTab !== 'general' && (
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="btn btn-secondary btn-icon-only mobile-only-btn"
                    style={{ padding: '6px', borderRadius: '50%' }}
                    title="Geri"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                
                <div style={{
                  width: '36px', height: '36px', borderRadius: chatTab === 'dm' ? '50%' : '10px',
                  background: chatTab === 'dm' ? getAvatarGradient(getDMUserId(selectedRoom)) : 'linear-gradient(135deg, rgba(183,1,22,0.1) 0%, rgba(183,1,22,0.04) 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(183,1,22,0.15)',
                  color: 'var(--accent-color)', flexShrink: 0, overflow: 'hidden'
                }}>
                  {chatTab === 'general' ? (
                    <MessageSquare size={16} />
                  ) : chatTab === 'groups' ? (
                    <Users size={16} />
                  ) : (
                    getDMAvatar(selectedRoom) ? (
                      <img src={getDMAvatar(selectedRoom)} alt={getDMName(selectedRoom)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      getInitials(getDMName(selectedRoom))
                    )
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chatTab === 'general' ? `${activeWorkspace?.name || 'Ekip'} Grubu` : chatTab === 'groups' ? selectedRoom.name : getDMName(selectedRoom)}
                    </span>
                    {messages.length > 0 && (
                      <span style={{
                        fontSize: '0.62rem', backgroundColor: 'rgba(183,1,22,0.06)', color: 'var(--accent-color)',
                        padding: '1px 6px', borderRadius: '8px', fontWeight: 700
                      }}>
                        {messages.length}
                      </span>
                    )}
                  </h2>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chatTab === 'general' 
                      ? 'Tüm ekip üyeleri bu kanalı görüntüleyebilir' 
                      : chatTab === 'groups' 
                        ? `${selectedRoom.members?.length || 0} üye bu grupta`
                        : 'Birebir özel mesajlaşma'
                    }
                  </p>
                </div>

                <button
                  className="btn btn-secondary btn-icon-only"
                  onClick={loadMessages}
                  disabled={loading}
                  style={{ padding: '8px', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Yenile"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              {/* Messages Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {loading && messages.length === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                    <RefreshCw className="animate-spin" size={20} style={{ color: 'var(--accent-color)' }} />
                  </div>
                )}

                {!loading && messages.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px', textAlign: 'center' }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(183,1,22,0.04) 0%, rgba(183,1,22,0.01) 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', marginBottom: '12px'
                    }}>
                      <MessageSquare size={24} style={{ opacity: 0.5 }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Henüz mesaj yok</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>İlk mesajı siz atarak sohbeti başlatın!</span>
                  </div>
                )}

                {groupedMessages.map(group => (
                  <div key={group.date}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '14px 0 10px' }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-glass)' }} />
                      <span style={{
                        fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700,
                        backgroundColor: 'var(--bg-surface-accent)', padding: '2px 10px', borderRadius: '12px'
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
                            marginBottom: '10px',
                          }}
                        >
                          {!isMine && (
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: getAvatarGradient(msg.user_id), color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.7rem', fontWeight: 800, flexShrink: 0, overflow: 'hidden'
                            }}>
                              {msg.profile?.avatar_url ? (
                                <img src={msg.profile.avatar_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                getInitials(name)
                              )}
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                            {!isMine && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px', paddingLeft: '4px' }}>
                                <span>{name}</span>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 400 }}>{formatTime(msg.created_at)}</span>
                              </div>
                            )}

                            <div style={{ position: 'relative', width: '100%' }}>
                              <div style={{
                                background: isMine ? 'linear-gradient(135deg, var(--accent-color) 0%, #d81b24 100%)' : 'var(--bg-surface-accent)',
                                color: isMine ? 'white' : 'var(--text-primary)',
                                padding: '8px 12px',
                                borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                fontSize: '0.85rem',
                                lineHeight: '1.4',
                                border: isMine ? 'none' : '1px solid var(--border-glass)',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                              }}>
                                {msg.reply_to && (
                                  <div style={{
                                    backgroundColor: isMine ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.03)',
                                    borderLeft: `2.5px solid ${isMine ? '#fff' : 'var(--accent-color)'}`,
                                    padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem',
                                    color: isMine ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)',
                                    marginBottom: '4px', display: 'flex', flexDirection: 'column'
                                  }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.68rem', color: isMine ? '#fff' : 'var(--accent-color)' }}>
                                      {(msg.reply_to as any)?.profile?.full_name || 'Kullanıcı'}
                                    </span>
                                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {(msg.reply_to as any)?.content}
                                    </span>
                                  </div>
                                )}
                                <div>{msg.content}</div>
                                {isMine && <span style={{ display: 'block', fontSize: '0.6rem', opacity: 0.6, marginTop: '3px', textAlign: 'right' }}>{formatTime(msg.created_at)}</span>}
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', width: '100%', marginTop: '1px' }}>
                              <button
                                onClick={() => setReplyTo(msg)}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.68rem',
                                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', padding: '2px 4px', borderRadius: '4px'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-color)'; e.currentTarget.style.backgroundColor = 'rgba(183, 1, 22, 0.04)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                              >
                                <Reply size={10} />
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

              {/* Reply Preview */}
              {replyTo && (
                <div style={{
                  backgroundColor: 'var(--bg-surface-accent)', padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  borderLeft: '3px solid var(--accent-color)', borderTop: '1px solid var(--border-glass)',
                }}>
                  <Reply size={12} style={{ color: 'var(--accent-color)' }} />
                  <div style={{ flex: 1, fontSize: '0.76rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{replyTo.profile?.full_name || 'Kullanıcı'}</span>
                    <span style={{ margin: '0 4px', opacity: 0.5 }}>•</span>
                    <span>{replyTo.content}</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={10} />
                  </button>
                </div>
              )}

              {/* Message Input Pill */}
              <div style={{
                padding: '10px 14px', backgroundColor: 'var(--bg-card)',
                display: 'flex', gap: '8px', alignItems: 'flex-end', borderTop: '1px solid var(--border-glass)'
              }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-surface-accent)',
                  border: `1px solid ${isFocused ? 'var(--accent-color)' : 'var(--border-glass)'}`,
                  borderRadius: '12px', padding: '2px 12px', transition: 'all 0.2s'
                }}>
                  <Smile size={20} style={{ color: 'var(--text-muted)', marginRight: '8px', cursor: 'pointer' }} onClick={() => setContent(prev => prev + '😊')} />
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Mesaj yazın..."
                    rows={1}
                    style={{
                      flex: 1, resize: 'none', backgroundColor: 'transparent', border: 'none',
                      padding: '8px 0', fontSize: '0.88rem', color: 'var(--text-primary)',
                      outline: 'none', maxHeight: '100px', lineHeight: '1.4'
                    }}
                    onInput={e => {
                      const el = e.currentTarget;
                      el.style.height = 'auto';
                      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
                    }}
                  />
                  <Paperclip size={18} style={{ color: 'var(--text-muted)', marginLeft: '8px', cursor: 'pointer', transform: 'rotate(45deg)' }} />
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: '#00a884', color: 'white', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#008f72'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#00a884'}
                >
                  {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* CREATE GROUP MODAL */}
      {showCreateGroupModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
            borderRadius: '16px', width: '400px', maxWidth: '90vw', padding: '20px',
            boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Yeni Grup Sohbeti Kur</span>
              <button onClick={() => setShowCreateGroupModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>GRUP ADI</label>
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Grup ismi girin..."
                className="form-input"
                style={{ padding: '10px', fontSize: '0.85rem', borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minHeight: 0 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ÜYELERİ DAVET ET</label>
              <div style={{
                maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-glass)',
                borderRadius: '8px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px'
              }}>
                {workspaceMembers.filter(m => m.user_id !== user?.id).map(member => (
                  <div
                    key={member.user_id}
                    onClick={() => toggleSelectMember(member.user_id)}
                    style={{
                      padding: '8px', borderRadius: '6px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: selectedMembers.includes(member.user_id) ? 'rgba(var(--accent-rgb, 183,1,22), 0.05)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.user_id)}
                      onChange={() => {}} // handled by click on container
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: getAvatarGradient(member.user_id), color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 800, overflow: 'hidden'
                    }}>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        getInitials(member.full_name)
                      )}
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{member.full_name}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
              className="btn btn-primary btn-block"
              style={{ padding: '12px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              Grubu Oluştur ve Davetleri Gönder
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
