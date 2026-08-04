import React, { useState, useEffect } from 'react';
import { TrendingUp, Cpu, Lightbulb, Zap, Sparkles, Rocket, Star, Bookmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NewsScreenProps {
  initialCategory?: 'all' | 'ai' | 'startup' | 'editors';
}

export const NewsScreen: React.FC<NewsScreenProps> = ({ initialCategory = 'all' }) => {
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
      logoText: 'T',
      logoBg: '#0ea5e9',
      imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80',
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
      logoText: 'V',
      logoBg: '#6366f1',
      imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
      date: '4 Saat Önce',
      category: 'Yapay Zeka',
      icon: <Sparkles size={16} />,
      color: '#6366f1',
      readTime: '4 dk',
      url: '#'
    },
    {
      id: 103,
      title: "Yerel Açık Kaynak LLM'ler Mobil Cihazlarda Sıfır Gecikmeyle Çalışıyor",
      summary: 'Cihaz üzerinde çalışan Llama 4 ve Mistral modelleri gizlilik odaklı uygulamaların geleceğini şekillendiriyor.',
      source: 'MIT Tech Review',
      logoText: 'M',
      logoBg: '#14b8a6',
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
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
      logoText: 'H',
      logoBg: '#ef4444',
      imageUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=600&q=80',
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
      logoText: 'E',
      logoBg: '#f59e0b',
      imageUrl: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?auto=format&fit=crop&w=600&q=80',
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
      logoText: 'S',
      logoBg: '#8b5cf6',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
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
      title: "2026'nın En Hızlı Büyüyen 50 B2B Girişimi Açıklandı",
      summary: 'Yıllık rapor yayınlandı. Büyüme rakamlarına göre SaaS pazarında inovasyon yapan lider firmaların derinlemesine analizi.',
      source: 'Forbes Tech',
      logoText: 'F',
      logoBg: '#1e3a8a',
      imageUrl: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&w=600&q=80',
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
      logoText: 'S',
      logoBg: '#ec4899',
      imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
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
      logoText: 'L',
      logoBg: '#14b8a6',
      imageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
      date: '4 Gün Önce',
      category: 'Editörün Seçimi',
      icon: <Star size={16} />,
      color: '#14b8a6',
      readTime: '6 dk',
      url: '#'
    }
  ];

  const renderNewsCard = (news: any) => (
    <div
      key={news.id}
      className="news-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '12px',
        borderRadius: '16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-glass)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}
    >
      {/* Cover Image */}
      <div style={{
        width: '100%',
        aspectRatio: '16/10',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)'
      }}
      className="news-img-container"
      >
        <img
          src={news.imageUrl}
          alt={news.title}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="news-cover-img"
        />
      </div>

      {/* Publisher Logo & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: news.logoBg || 'var(--accent-color)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.72rem',
          fontWeight: 800,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          {news.logoText}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
          {news.source}
        </span>
      </div>

      {/* News Title */}
      <h3 style={{
        fontSize: '0.92rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.4,
        margin: '0 0 14px',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {news.title}
      </h3>

      {/* Footer (Özet Badge & Time) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-glass)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          border: '1.5px solid var(--border-glass)',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.72rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          transition: 'all 0.2s ease-in-out'
        }}
        className="news-ozet-badge"
        >
          <span>Özet</span>
          <TrendingUp size={12} style={{ color: 'var(--accent-color)' }} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {news.date}
        </span>
      </div>
    </div>
  );

  return (
    <div className="news-container fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header Section */}
      <div className="news-header" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '8px' }}>
          Girişimcilik & Teknoloji Dünyasından Haberler 🚀
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Hoş geldin, <strong>{userName}</strong>. Yapay zeka gelişmelerini, ekosistem haberlerini ve editörlerimizin seçtiği özel rehberleri takip edebilirsin.
        </p>
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

