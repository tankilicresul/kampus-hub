import React, { useState, useEffect } from 'react';
import { TrendingUp, Cpu, Lightbulb, Zap, MessageSquare, Users, Sparkles, Rocket, Star, Bookmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NewsScreenProps {
  onNavigateToChat?: () => void;
  initialCategory?: 'all' | 'ai' | 'startup' | 'editors';
}

export const NewsScreen: React.FC<NewsScreenProps> = ({ onNavigateToChat, initialCategory = 'all' }) => {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Girişimci';
  const [activeFilter, setActiveFilter] = useState<'all' | 'ai' | 'startup' | 'editors'>(initialCategory);

  useEffect(() => {
    if (initialCategory) {
      setActiveFilter(initialCategory);
    }
  }, [initialCategory]);

  // Categorized News Data
  const aiNews = [
    {
      id: 101,
      title: 'Claude 3.7 & GPT-5 Mimarileri Otonom Kodlamada Çığır Açtı',
      summary: 'Yapay zeka ajanları artık komple SaaS projelerini uçtan uca mimari kararlarla yazıp deploy edebiliyor.',
      source: 'TechCrunch',
      date: '2 Saat Önce',
      category: 'Yapay Zeka',
      icon: <Cpu size={16} />,
      color: '#3b82f6',
      readTime: '3 dk',
      url: '#'
    },
    {
      id: 102,
      title: 'Ajanik Kodlama (Agentic Coding) Ekosistemi Yatırım Rekorunu Kırdı',
      summary: 'Kodlama ve otomasyon ajanları geliştiren girişimlere yapılan toplam yatırım 12 milyar doları aştı.',
      source: 'VentureBeat',
      date: '4 Saat Önce',
      category: 'Yapay Zeka',
      icon: <Sparkles size={16} />,
      color: '#6366f1',
      readTime: '4 dk',
      url: '#'
    },
    {
      id: 103,
      title: 'Yerel Açık Kaynak LLM\'ler Mobil Cihazlarda Sıfır Gecikmeyle Çalışıyor',
      summary: 'Cihaz üzerinde çalışan Llama 4 ve Mistral modelleri gizlilik odaklı uygulamaların geleceğini şekillendiriyor.',
      source: 'MIT Tech Review',
      date: '1 Gün Önce',
      category: 'Yapay Zeka',
      icon: <Cpu size={16} />,
      color: '#06b6d4',
      readTime: '5 dk',
      url: '#'
    }
  ];

  const startupNews = [
    {
      id: 201,
      title: 'Tohum Yatırım Aşaması (Seed Stage) Şirketleri İçin Yeni Yatırım Stratejileri',
      summary: 'B2B ve SaaS pazarlarında yatırımcıların aradığı ilk 5 anahtar büyüme metriği ve müşteri elde tutma stratejileri.',
      source: 'Harvard Business Review',
      date: '5 Saat Önce',
      category: 'Girişimcilik',
      icon: <TrendingUp size={16} />,
      color: '#10b981',
      readTime: '5 dk',
      url: '#'
    },
    {
      id: 202,
      title: 'Başarılı Startup Kurucularının Sabah Rutinleri ve Odaklanma Sırları',
      summary: 'Günün ilk 3 saatinde derin çalışma (deep work) alışkanlığı kazanan kurucuların zaman yönetimi prensipleri.',
      source: 'Entrepreneur',
      date: '1 Gün Önce',
      category: 'Girişimcilik',
      icon: <Zap size={16} />,
      color: '#f59e0b',
      readTime: '4 dk',
      url: '#'
    },
    {
      id: 203,
      title: 'SaaS Ürünlerinde Kullanıcı Tutma (Retention) Oranını %40 Artıran 5 Temel Metrik',
      summary: 'Onboarding süreçlerini optimize eden ürün yönetim teknikleri ve abonelik büyüme modelleri.',
      source: 'SaaS Weekly',
      date: '2 Gün Önce',
      category: 'Girişimcilik',
      icon: <Lightbulb size={16} />,
      color: '#8b5cf6',
      readTime: '6 dk',
      url: '#'
    }
  ];

  const editorsNews = [
    {
      id: 301,
      title: '2026\'nın En Hızlı Büyüyen 50 B2B Girişimi Açıklandı',
      summary: 'Yıllık rapor yayınlandı. Büyüme rakamlarına göre SaaS pazarında inovasyon yapan lider firmaların derinlemesine analizi.',
      source: 'Forbes Tech',
      date: 'Özel Rapor',
      category: 'Editörün Seçimi',
      icon: <Star size={16} />,
      color: '#ff9f0a',
      readTime: '8 dk',
      url: '#',
      featured: true
    },
    {
      id: 302,
      title: 'Küresel Pazarlara Açılan Türk Teknoloji Şirketlerinin Başarı Hikayeleri',
      summary: 'Yurt dışına yazılım ve hizmet ihraç eden kurucuların pazar giriş stratejileri, ölçeklenme adımları ve tavsiyeleri.',
      source: 'StartupWatch',
      date: '3 Gün Önce',
      category: 'Editörün Seçimi',
      icon: <Bookmark size={16} />,
      color: '#ec4899',
      readTime: '7 dk',
      url: '#'
    },
    {
      id: 303,
      title: 'Erken Aşama Girişimciler İçin Hukuk ve Şirketleşme Rehberi',
      summary: 'Delaware, İngiltere ve Türkiye kurumsal yapıları, hisse paylaşımı ve yatırım sözleşmeleri (SAFE) esasları.',
      source: 'LegalTech Journal',
      date: '4 Gün Önce',
      category: 'Editörün Seçimi',
      icon: <Star size={16} />,
      color: '#14b8a6',
      readTime: '6 dk',
      url: '#'
    }
  ];

  const renderNewsCard = (news: any) => (
    <div key={news.id} className="news-card" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      padding: '20px',
      borderRadius: '16px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-glass)',
      transition: 'all 0.2s ease-in-out',
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: news.color,
            backgroundColor: `${news.color}15`,
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700
          }}>
            {news.icon} {news.category}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{news.readTime}</span>
        </div>
        
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.35 }}>
          {news.title}
        </h3>

        {news.summary && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px' }}>
            {news.summary}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-glass)', marginTop: 'auto' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{news.source}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{news.date}</span>
      </div>
    </div>
  );

  return (
    <div className="news-container fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Community & Chat Banner */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.15) 0%, rgba(255, 107, 0, 0.08) 100%)',
        border: '1px solid rgba(255, 159, 10, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 16px rgba(255, 159, 10, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            backgroundColor: 'var(--accent-color)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255, 159, 10, 0.3)'
          }}>
            <Users size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              TanCoreLab Topluluk Paneli & Herkesle Sohbet 💬
            </h3>
            <p style={{ fontSize: '0.82rem', margin: '2px 0 0', color: 'var(--text-secondary)' }}>
              Tüm platform üyeleriyle anlık iletişim kurabilir, fikir alışverişinde bulunabilirsin.
            </p>
          </div>
        </div>
        {onNavigateToChat && (
          <button 
            className="btn btn-primary"
            onClick={onNavigateToChat}
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px' }}
          >
            <MessageSquare size={16} />
            <span>Herkesle Sohbet Et</span>
          </button>
        )}
      </div>

      {/* Header Section */}
      <div className="news-header" style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '8px' }}>
          Girişimcilik & Teknoloji Dünyasından Haberler 🚀
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Hoş geldin, <strong>{userName}</strong>. Yapay zeka gelişmelerini, ekosistem haberlerini ve editörlerimizin seçtiği özel rehberleri takip edebilirsin.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginBottom: '32px',
        borderBottom: '1px solid var(--border-glass)',
        paddingBottom: '12px'
      }}>
        {[
          { key: 'all', label: 'Tüm Haberler ✨' },
          { key: 'ai', label: '🤖 1- Yapay Zeka Gelişmeleri' },
          { key: 'startup', label: '🚀 2- Girişimcilik Haberleri' },
          { key: 'editors', label: '⭐ 3- Editörün Seçimleri' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 800,
              border: '1.5px solid',
              borderColor: activeFilter === tab.key ? 'var(--accent-color)' : 'var(--border-glass)',
              backgroundColor: activeFilter === tab.key ? 'rgba(255,159,10,0.12)' : 'transparent',
              color: activeFilter === tab.key ? 'var(--accent-color)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: Yapay Zeka Gelişmeleri */}
      {(activeFilter === 'all' || activeFilter === 'ai') && (
        <section style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span style={{
                padding: '6px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex'
              }}>
                <Cpu size={20} />
              </span>
              1- Yapay Zeka Gelişmeleri
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700 }}>3 Güncel İçerik</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {aiNews.map(renderNewsCard)}
          </div>
        </section>
      )}

      {/* SECTION 2: Girişimcilik Haberleri */}
      {(activeFilter === 'all' || activeFilter === 'startup') && (
        <section style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span style={{
                padding: '6px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex'
              }}>
                <Rocket size={20} />
              </span>
              2- Girişimcilik Haberleri
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700 }}>3 Güncel İçerik</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {startupNews.map(renderNewsCard)}
          </div>
        </section>
      )}

      {/* SECTION 3: Editörün Seçimleri */}
      {(activeFilter === 'all' || activeFilter === 'editors') && (
        <section style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span style={{
                padding: '6px', borderRadius: '10px', backgroundColor: 'rgba(255, 159, 10, 0.12)', color: '#ff9f0a', display: 'flex'
              }}>
                <Star size={20} />
              </span>
              3- Editörün Seçimleri
            </h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: 700 }}>3 Özel İçerik</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {editorsNews.map(renderNewsCard)}
          </div>
        </section>
      )}
    </div>
  );
};

