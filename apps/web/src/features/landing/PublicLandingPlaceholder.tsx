import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, Sparkles, ShieldCheck, 
  BarChart3, Layers, Users, Zap 
} from 'lucide-react';

export const PublicLandingPlaceholder: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'var(--bg-primary, #0f172a)',
      color: 'var(--text-primary, #f8fafc)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background ambient lighting effects */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '500px',
        height: '500px',
        backgroundColor: 'rgba(255, 159, 10, 0.12)',
        filter: 'blur(140px)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '5%',
        right: '10%',
        width: '400px',
        height: '400px',
        backgroundColor: 'rgba(59, 130, 246, 0.10)',
        filter: 'blur(140px)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Top Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 32px',
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255,159,10,0.2), rgba(255,159,10,0.05))',
            border: '1px solid rgba(255,159,10,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255,159,10,0.15)'
          }}>
            <img 
              src="/logo.svg" 
              alt="TanCoreLab Logo" 
              style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
            />
          </div>
          <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff, #e2e8f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              TanCoreLab
            </span>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ff9f0a', display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Business & Tech Hub
            </span>
          </div>
        </div>

        {/* Right Nav Action */}
        <Link 
          to="/login" 
          className="btn btn-primary" 
          style={{
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.9rem',
            backgroundColor: '#ff9f0a',
            color: '#000000',
            boxShadow: '0 4px 16px rgba(255, 159, 10, 0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s'
          }}
        >
          <span>Giriş Yap / Hesabım</span>
          <ArrowRight size={16} />
        </Link>
      </header>

      {/* Hero Body */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 24px 60px',
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        zIndex: 10,
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '48px',
          alignItems: 'center',
          width: '100%'
        }}>
          {/* Left Column Text & Presentation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Pill Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 159, 10, 0.1)',
              border: '1px solid rgba(255, 159, 10, 0.25)',
              color: '#ff9f0a',
              fontSize: '0.8rem',
              fontWeight: 700,
              width: 'fit-content'
            }}>
              <Sparkles size={14} />
              <span>TanCoreLab Ekip & Operasyon Ekosistemi</span>
            </div>

            {/* Main Title */}
            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary, #ffffff)'
            }}>
              İş Süreçlerinizi ve Teknolojinizi <span style={{ background: 'linear-gradient(135deg, #ff9f0a, #ffc043)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tek Yerden Yönetin</span>
            </h1>

            {/* Description */}
            <p style={{
              fontSize: '1.05rem',
              lineHeight: 1.65,
              color: 'var(--text-secondary, #94a3b8)',
              margin: 0,
              maxWidth: '540px'
            }}>
              TanCoreLab ile görevlerinizi takip edin, CRM süreçlerinizi yönetin, günlük performans raporları oluşturun ve ekibinizle kusursuz bir uyum yakalayın.
            </p>

            {/* Feature Bullet Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginTop: '4px'
            }}>
              {[
                { title: 'Görev & İçerik Takibi', desc: 'İçerik planlama ve Kanban kanban kartları', icon: <Layers size={18} style={{ color: '#ff9f0a' }} /> },
                { title: 'CRM & Müşteri Yönetimi', desc: 'İşletme görüşmeleri ve üye süreçleri', icon: <BarChart3 size={18} style={{ color: '#38bdf8' }} /> },
                { title: 'Ekip Raporlama', desc: 'Günlük çalışma özetleri ve aktivite takvimi', icon: <Users size={18} style={{ color: '#a855f7' }} /> },
                { title: 'Anlık Güvenlik', desc: 'Rol tabanlı yetkilendirme & güvenli erişim', icon: <ShieldCheck size={18} style={{ color: '#22c55e' }} /> },
              ].map((feat, idx) => (
                <div key={idx} style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>{feat.icon}</div>
                  <div>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #f8fafc)' }}>{feat.title}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', margin: '2px 0 0', lineHeight: 1.3 }}>{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px' }}>
              <Link 
                to="/login" 
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '14px 28px',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '1.02rem',
                  backgroundColor: '#ff9f0a',
                  color: '#000000',
                  boxShadow: '0 8px 24px rgba(255, 159, 10, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>Giriş Yap / Hesabım</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* Right Column Hero Graphic with Generated Visual */}
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {/* Decorative Glow */}
            <div style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '28px',
              background: 'linear-gradient(135deg, rgba(255,159,10,0.3), rgba(59,130,246,0.2))',
              filter: 'blur(20px)',
              opacity: 0.6,
              zIndex: 0
            }} />

            {/* Main Image Frame */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              maxWidth: '520px',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(15, 23, 42, 0.8)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)'
            }}>
              <img 
                src="/landing_hero.jpg" 
                alt="TanCoreLab Business & Technology Hub" 
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '440px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />

              {/* Overlay Glass Floating Badge 1 */}
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '14px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ffffff' }}>
                  Yüksek Verimli Ekip & İş Süreçleri
                </span>
              </div>

              {/* Overlay Glass Floating Badge 2 */}
              <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 159, 10, 0.3)',
                borderRadius: '14px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
              }}>
                <Zap size={16} style={{ color: '#ff9f0a' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ff9f0a' }}>
                  TanCoreLab v2.5 Platform
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
