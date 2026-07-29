import React from 'react';
import { ExternalLink, TrendingUp, Cpu, Lightbulb, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const NewsScreen: React.FC = () => {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Girişimci';

  // Sample static news data for presentation
  const newsItems = [
    {
      id: 1,
      title: 'Yapay Zeka Destekli Girişimler Silikon Vadisi\'nde Yeniden Rekor Kırdı',
      source: 'TechCrunch',
      date: '2 Saat Önce',
      category: 'Yapay Zeka',
      icon: <Cpu size={16} />,
      color: '#3b82f6',
      readTime: '3 dk',
      url: '#'
    },
    {
      id: 2,
      title: 'Tohum Yatırım Aşaması (Seed Stage) Şirketleri İçin Yeni Yatırım Stratejileri',
      source: 'Harvard Business Review',
      date: '5 Saat Önce',
      category: 'Finansman',
      icon: <TrendingUp size={16} />,
      color: '#10b981',
      readTime: '5 dk',
      url: '#'
    },
    {
      id: 3,
      title: 'Başarılı Startup Kurucularının Sabah Rutinleri ve Odaklanma Sırları',
      source: 'Entrepreneur',
      date: '1 Gün Önce',
      category: 'Motivasyon',
      icon: <Zap size={16} />,
      color: '#f59e0b',
      readTime: '4 dk',
      url: '#'
    },
    {
      id: 4,
      title: 'SaaS Ürünlerinde Kullanıcı Tutma (Retention) Oranını %40 Artıran 5 Temel Metrik',
      source: 'SaaS Weekly',
      date: '2 Gün Önce',
      category: 'Büyüme',
      icon: <Lightbulb size={16} />,
      color: '#8b5cf6',
      readTime: '6 dk',
      url: '#'
    }
  ];

  return (
    <div className="news-screen fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-main)',
      color: 'var(--text-primary)',
      padding: '24px',
      gap: '24px',
      overflowY: 'auto'
    }}>
      {/* Header Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          Girişimcilik Dünyasından Haberler 🚀
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', lineHeight: 1.5 }}>
          Hoş geldin, <strong>{userName}</strong>. Teknoloji, yapay zeka ve startup ekosistemindeki en güncel gelişmeleri, ilham verici makaleleri ve büyüme stratejilerini buradan takip edebilirsin.
        </p>
      </div>

      {/* Featured Headline / Banner */}
      <div style={{
        backgroundColor: 'rgba(255, 159, 10, 0.08)',
        border: '1px solid rgba(255, 159, 10, 0.2)',
        borderRadius: '16px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        cursor: 'pointer',
        transition: 'transform 0.2s',
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1, color: 'var(--accent-color)' }}>
          <TrendingUp size={160} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ backgroundColor: 'var(--accent-color)', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Haftanın Öne Çıkanı
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tavsiye Edilen Okuma</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, zIndex: 1 }}>2026'nın En Hızlı Büyüyen 50 B2B Girişimi Açıklandı</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, zIndex: 1, maxWidth: '80%' }}>
          Yıllık rapor yayınlandı. Büyüme rakamlarına göre SaaS pazarında inovasyon yapan firmaların analizine hemen göz atın.
        </p>
        <button style={{
          marginTop: '8px',
          alignSelf: 'flex-start',
          background: 'none',
          border: 'none',
          color: 'var(--accent-color)',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: 0,
          cursor: 'pointer',
          zIndex: 1
        }}>
          Haberi Oku <ExternalLink size={14} />
        </button>
      </div>

      {/* News Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {newsItems.map((news) => (
          <div key={news.id} style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            transition: 'all 0.2s',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = news.color;
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--border-glass)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, lineHeight: 1.4, color: 'var(--text-primary)' }}>
              {news.title}
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{news.source}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{news.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
