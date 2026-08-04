import React from 'react';
import { ExternalLink, TrendingUp, Cpu, Lightbulb, Zap, MessageSquare, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NewsScreenProps {
  onNavigateToChat?: () => void;
}

export const NewsScreen: React.FC<NewsScreenProps> = ({ onNavigateToChat }) => {
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
    <div className="news-container fade-in">
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
        marginBottom: '20px',
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
      <div className="news-header">
        <h1>Girişimcilik Dünyasından Haberler 🚀</h1>
        <p>
          Hoş geldin, <strong>{userName}</strong>. Teknoloji, yapay zeka ve startup ekosistemindeki en güncel gelişmeleri, ilham verici makaleleri ve büyüme stratejilerini buradan takip edebilirsin.
        </p>
      </div>

      {/* Featured Headline / Banner */}
      <div className="featured-banner">
        <div className="featured-banner-icon">
          <TrendingUp size={160} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="featured-badge">Haftanın Öne Çıkanı</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tavsiye Edilen Okuma</span>
        </div>
        <h2>2026'nın En Hızlı Büyüyen 50 B2B Girişimi Açıklandı</h2>
        <p>
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
      <div className="news-grid">
        {newsItems.map((news) => (
          <div key={news.id} className="news-card">
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
            
            <h3>{news.title}</h3>
            
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
