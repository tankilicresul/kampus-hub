import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePageMetadata, type PageMetadata } from '../../hooks/usePageMetadata';
import { 
  Briefcase, 
  Cpu, 
  Rocket, 
  Share2, 
  Compass, 
  FolderGit2, 
  ArrowRight, 
  GraduationCap, 
  Sparkles,
  Layers,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const ResulTankilicProfilePage: React.FC = () => {
  const metadata: PageMetadata = useMemo(() => ({
    title: 'Resul Tankılıç | TanCoreLab, Yapay Zekâ ve Girişimcilik',
    description: "Resul Tankılıç'ın TanCoreLab, yapay zekâ, girişimcilik, sosyal medya, endüstri mühendisliği ve dijital operasyon alanlarındaki çalışmalarını inceleyin.",
    canonical: 'https://tancorelab.com/resul-tankilic',
    robots: 'index, follow',
    ogType: 'profile',
    ogTitle: 'Resul Tankılıç | TanCoreLab',
    ogDescription: "Resul Tankılıç'ın TanCoreLab, yapay zekâ, girişimcilik ve dijital operasyon alanlarındaki çalışmaları.",
    ogUrl: 'https://tancorelab.com/resul-tankilic',
    twitterCard: 'summary',
    twitterTitle: 'Resul Tankılıç | TanCoreLab',
    twitterDescription: "Resul Tankılıç'ın TanCoreLab ve teknoloji çalışmaları.",
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      '@id': 'https://tancorelab.com/resul-tankilic#profile',
      'url': 'https://tancorelab.com/resul-tankilic',
      'name': 'Resul Tankılıç | TanCoreLab',
      'mainEntity': {
        '@type': 'Person',
        '@id': 'https://tancorelab.com/resul-tankilic#person',
        'name': 'Resul Tankılıç',
        'alternateName': 'Resul Tankilic',
        'url': 'https://tancorelab.com/resul-tankilic',
        'description': 'TanCoreLab, yapay zekâ, girişimcilik, endüstri mühendisliği ve dijital operasyon alanlarında çalışan teknoloji geliştiricisi ve girişimci.'
      }
    }
  }), []);

  usePageMetadata(metadata);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #f8fafc)', fontFamily: "'Outfit', system-ui, -apple-system, sans-serif" }}>
      {/* ── HEADER NAVIGATION ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(16px)', backgroundColor: 'rgba(15, 23, 42, 0.85)', borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
            <img src="/logo.svg" alt="TanCoreLab Logo" style={{ height: '36px', width: 'auto' }} />
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TanCoreLab
            </span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-secondary, #94a3b8)', fontWeight: 500, fontSize: '0.95rem', transition: 'color 0.2s ease' }}>
              Ana Sayfa
            </Link>
            <Link to="/resul-tankilic" style={{ textDecoration: 'none', color: 'var(--accent-color, #ff9f0a)', fontWeight: 700, fontSize: '0.95rem' }}>
              Resul Tankılıç
            </Link>
            <Link to="/login" style={{ textDecoration: 'none', padding: '8px 18px', minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'var(--accent-color, #ff9f0a)', color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(255, 159, 10, 0.25)' }}>
              Giriş Yap
            </Link>
          </nav>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', padding: '40px 20px 80px', width: '100%', boxSizing: 'border-box' }}>
        
        {/* ── HERO SECTION ── */}
        <section style={{ marginBottom: '60px', textAlign: 'center', padding: '40px 24px', borderRadius: '24px', background: 'radial-gradient(circle at top, rgba(255, 159, 10, 0.12) 0%, rgba(15, 23, 42, 0.6) 70%)', border: '1px solid rgba(255, 159, 10, 0.2)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', backgroundColor: 'rgba(255, 159, 10, 0.15)', color: '#ff9f0a', fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px' }}>
            <Sparkles size={16} /> TanCoreLab Kurucusu & Geliştiricisi
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 3.8rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Resul Tankılıç
          </h1>
          <p style={{ fontSize: '1.2rem', lineHeight: 1.6, color: 'var(--text-secondary, #94a3b8)', maxWidth: '800px', margin: '0 auto 28px', fontWeight: 400 }}>
            Resul Tankılıç; endüstri mühendisliği, yapay zekâ, girişimcilik, sosyal medya ve dijital operasyon sistemleri üzerine çalışan, TanCoreLab projesini geliştiren bir üniversite öğrencisi ve girişimcidir.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link to="/login" style={{ minHeight: '44px', padding: '12px 28px', borderRadius: '12px', backgroundColor: '#ff9f0a', color: '#0f172a', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'transform 0.2s ease, boxShadow 0.2s ease', boxShadow: '0 6px 20px rgba(255, 159, 10, 0.3)' }}>
              TanCoreLab Platformu <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* ── BREADCRUMB ── */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: '32px', fontSize: '0.875rem', color: '#64748b' }}>
          <ol style={{ display: 'flex', gap: '8px', alignItems: 'center', listStyle: 'none', padding: 0, margin: 0 }}>
            <li><Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Ana Sayfa</Link></li>
            <li><ChevronRight size={14} /></li>
            <li aria-current="page" style={{ color: '#ff9f0a', fontWeight: 600 }}>Resul Tankılıç</li>
          </ol>
        </nav>

        <div style={{ display: 'grid', gap: '32px' }}>
          
          {/* SECTION 1: BİYOGRAFİ & KİMDİR */}
          <section id="bio" style={{ padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <GraduationCap style={{ color: '#ff9f0a' }} /> 1. Resul Tankılıç Kimdir?
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1', margin: '0 0 16px' }}>
              Resul Tankılıç; modern yazılım mimarileri, yapay zekâ entegrasyonları, endüstri mühendisliği prensipleri ve dijital girişimcilik alanlarında çözümler üreten teknoloji geliştiricisidir. Operasyonel verimlilik ve kullanıcı deneyimini ön planda tutan yenilikçi projelerin tasarımını ve teknik geliştirmesini üstlenmektedir.
            </p>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
              İsmi İngilizce karakterlerle Resul Tankilic olarak da yazılmaktadır.
            </p>
          </section>

          {/* SECTION 2: TANCORELAB */}
          <section id="tancorelab" style={{ padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Layers style={{ color: '#ff9f0a' }} /> 2. TanCoreLab
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1', margin: 0 }}>
              TanCoreLab, Resul Tankılıç tarafından geliştirilen; görev takibi, CRM müşteri yönetimi, ekip içi günlük raporlama, takvim entegrasyonu ve operasyonel iş akışlarını tek bir çatı altında toplayan kapsamlı bir yönetim platformudur. Web ve mobil ekosistemler için yüksek performanslı mimariler sunmaktadır.
            </p>
          </section>

          {/* SECTION 3: KAMPÜS KAPINDA */}
          <section id="kampus-kapinda" style={{ padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Rocket style={{ color: '#ff9f0a' }} /> 3. Kampüs Kapında
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1', margin: 0 }}>
              Kampüs Kapında projesi, üniversite yaşamına yönelik hızlı teslimat, öğrenci toplulukları etkileşimi ve dijital operasyon çözümleri sunmayı hedefleyen bir girişimcilik çalışmasıdır. Resul Tankılıç, Kampüs Kapında ekosisteminin teknik altyapısını ve sahadaki operasyonel süreçlerini planlamaktadır.
            </p>
          </section>

          {/* SECTION 4: YAPAY ZEKÂ VE OTOMASYON */}
          <section id="ai-automation" style={{ padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Cpu style={{ color: '#ff9f0a' }} /> 4. Yapay Zekâ ve Otomasyon Çalışmaları
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1', margin: 0 }}>
              İş süreçlerinde verimliliği artırmak amacıyla üretken yapay zekâ (GenAI), otomatik ajan sistemleri (AI agents) ve akıllı veri analitiği üzerine çalışmalar sürdürülmektedir. TanCoreLab platformunda yapay zekâ destekli otomasyonlar entegre edilerek rutin görevlerin minimum insan müdahalesiyle tamamlanması sağlanmaktadır.
            </p>
          </section>

          {/* SECTION 5: GİRİŞİMCİLİK VE ÜRÜN GELİŞTİRME */}
          <section id="entrepreneurship" style={{ padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Briefcase style={{ color: '#ff9f0a' }} /> 5. Girişimcilik ve Ürün Geliştirme
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1', margin: 0 }}>
              Ürün yönetimi, prototipleme, MVP üretimi ve ölçeklenebilir teknoloji ürünlerinin geliştirmesi üzerine odaklanılmaktadır. TanCoreLab geliştiricisi olarak Resul Tankılıç, kullanıcı odaklı tasarım ilkeleriyle pazardaki ihtiyaçlara yönelik yenilikçi yazılımlar inşa eder.
            </p>
          </section>

          {/* SECTION 6: SOSYAL MEDYA VE İÇERİK ÜRETİMİ */}
          <section id="social-media" style={{ padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Share2 style={{ color: '#ff9f0a' }} /> 6. Sosyal Medya ve İçerik Üretimi
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1', margin: 0 }}>
              Teknoloji, yazılım, yapay zekâ ve girişimcilik ekosistemine dair dijital içerik üretimi ve topluluk etkileşimi yönetilmektedir. Sosyal medya stratejileriyle marka görünürlüğü ve hedef kitleye değer sağlama amaçlanır.
            </p>
          </section>

          {/* SECTION 7: ENDÜSTRİ MÜHENDİSLİĞİ VE OPERASYON YÖNETİMİ */}
          <section id="industrial-engineering" style={{ padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Compass style={{ color: '#ff9f0a' }} /> 7. Endüstri Mühendisliği ve Operasyon Yönetimi
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1', margin: 0 }}>
              Endüstri mühendisliğinin sistem modelleme, süreç optimizasyonu, tedarik zinciri ve verimlilik yaklaşımları yazılım projelerine entegre edilmektedir. Karmaşık operasyonel süreçlerin matematiksel ve algoritmik temellerle daha sade ve yönetilebilir hale getirilmesi hedeflenir.
            </p>
          </section>

          {/* SECTION 8: PROJELER */}
          <section id="projects" style={{ padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FolderGit2 style={{ color: '#ff9f0a' }} /> 8. Öne Çıkan Projeler
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px', color: '#ff9f0a' }}>TanCoreLab</h3>
                <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  Görev, CRM, raporlama ve ekip operasyon yönetim platformu.
                </p>
              </div>
              <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px', color: '#ff9f0a' }}>Kampüs Kapında</h3>
                <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                  Üniversite öğrencilerine özel operasyon ve dağıtım çözümleri.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 9: SOSYAL BAĞLANTILAR */}
          <section id="social-links" style={{ padding: '32px', borderRadius: '16px', backgroundColor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ExternalLink style={{ color: '#ff9f0a' }} /> 9. Bağlantılar ve İletişim
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#cbd5e1', margin: 0 }}>
              Resul Tankılıç'ın güncel teknoloji projeleri ve TanCoreLab platformu hakkındaki gelişmeler TanCoreLab web sitesi ve resmi kanallar üzerinden paylaşılmaktadır.
            </p>
          </section>

          {/* SECTION 10: TANCORELAB CTA */}
          <section id="cta" style={{ padding: '40px 32px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(255, 159, 10, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)', border: '1px solid rgba(255, 159, 10, 0.3)', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 12px', color: '#fff' }}>
              10. TanCoreLab Platformunu Keşfedin
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#cbd5e1', maxWidth: '600px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              Resul Tankılıç tarafından geliştirilen TanCoreLab platformunda hemen hesabınızı oluşturun ve operasyonlarınızı yönetmeye başlayın.
            </p>
            <Link to="/login" style={{ minHeight: '44px', padding: '14px 32px', borderRadius: '12px', backgroundColor: '#ff9f0a', color: '#0f172a', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1rem', transition: 'all 0.2s ease', boxShadow: '0 6px 20px rgba(255, 159, 10, 0.35)' }}>
              TanCoreLab'e Giriş Yap <ArrowRight size={20} />
            </Link>
          </section>

        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '32px 20px', backgroundColor: 'rgba(15, 23, 42, 0.95)', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', fontSize: '0.9rem', color: '#64748b' }}>
          <div>
            © {new Date().getFullYear()} TanCoreLab. Resul Tankılıç tarafından geliştirilmiştir.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Ana Sayfa</Link>
            <Link to="/resul-tankilic" style={{ color: '#ff9f0a', textDecoration: 'none', fontWeight: 600 }}>Resul Tankılıç</Link>
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Giriş Yap</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
