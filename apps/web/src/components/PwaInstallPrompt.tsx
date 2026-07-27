import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallPromptProps {
  forceOpen?: boolean;
  onCloseForce?: () => void;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({ forceOpen, onCloseForce }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [fallbackPlatform, setFallbackPlatform] = useState<'desktop' | 'android' | 'ios'>('desktop');
  const [isInstalledSuccess, setIsInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if app is already running in standalone mode (already installed as PWA)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as any).standalone === true;
      return isStandaloneMedia || isNavStandalone;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    // 2. Check platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    const androidDevice = /android/.test(userAgent);
    setIsIOS(iosDevice);

    if (iosDevice) {
      setFallbackPlatform('ios');
    } else if (androidDevice) {
      setFallbackPlatform('android');
    } else {
      setFallbackPlatform('desktop');
    }

    // 3. Check if window already has cached deferredPrompt
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    // 4. Listen for Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleCustomPromptReady = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setDeferredPrompt(customEvent.detail);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handleCustomPromptReady);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handleCustomPromptReady);
    };
  }, []);

  // Handle external force open request (e.g. user clicked "Uygulamayı İndir" button in header)
  useEffect(() => {
    if (forceOpen) {
      if (isIOS) {
        setShowIosModal(true);
      } else if (deferredPrompt) {
        handleInstallClick();
      } else {
        setShowFallbackModal(true);
      }
    }
  }, [forceOpen]);

  const handleInstallClick = async () => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(15);

    if (isIOS) {
      setShowIosModal(true);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalledSuccess(true);
          setShowBanner(false);
          localStorage.setItem('pwa_installed', 'true');
        }
        setDeferredPrompt(null);
        if (onCloseForce) onCloseForce();
      } catch (err) {
        console.error('Install prompt error:', err);
        if (onCloseForce) onCloseForce();
      }
    } else {
      // Fallback if beforeinstallprompt wasn't triggered yet or browser doesn't support it
      if (isIOS) {
        setShowIosModal(true);
      } else {
        setShowFallbackModal(true);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIosModal(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    if (onCloseForce) onCloseForce();
  };

  // If app is already installed/standalone and not force opened, render nothing
  if (isStandalone && !forceOpen) return null;

  return (
    <>
      {/* First-launch PWA Banner / Notification Card */}
      {showBanner && !isInstalledSuccess && (
        <div className="pwa-install-banner-overlay">
          <div className="pwa-install-card animate-slide-up">
            <button className="pwa-close-btn" onClick={handleDismiss} title="Kapat">
              <X size={18} />
            </button>

            <div className="pwa-card-header">
              <div className="pwa-icon-glow">
                <Smartphone size={28} className="pwa-phone-icon" />
                <Sparkles size={16} className="pwa-sparkle-icon" />
              </div>
              <div className="pwa-title-area">
                <div className="pwa-badge">
                  <Sparkles size={12} /> Mobil Uygulama
                </div>
                <h3 className="pwa-title">Uygulamayı Yükle!</h3>
                <p className="pwa-subtitle">
                  Ana ekrana ekle, hızlıca kullan.
                </p>
              </div>
            </div>

            {/* Platform Feature List */}
            <div className="pwa-features-grid">
              <div className="pwa-feature-item">
                <CheckCircle2 size={16} className="pwa-check-icon" />
                <span>Hızlı Erişim</span>
              </div>
              <div className="pwa-feature-item">
                <CheckCircle2 size={16} className="pwa-check-icon" />
                <span>Tam Ekran</span>
              </div>
              <div className="pwa-feature-item">
                <CheckCircle2 size={16} className="pwa-check-icon" />
                <span>Bildirimler</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pwa-actions">
              <button className="btn btn-primary pwa-main-btn" onClick={handleInstallClick}>
                <Download size={18} />
                <span>{isIOS ? 'Yükleme Adımları' : 'Hemen Yükle'}</span>
                <ArrowRight size={16} />
              </button>
              <button className="btn btn-ghost pwa-sub-btn" onClick={handleDismiss}>
                Sonra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Step-by-Step PWA Installation Guide Bottom Sheet Modal */}
      {showIosModal && (
        <div className="modal-backdrop pwa-ios-modal-backdrop" onClick={() => { setShowIosModal(false); if (onCloseForce) onCloseForce(); }}>
          <div className="modal-content pwa-ios-sheet animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-sheet-handle" />
            
            <div className="modal-header pwa-ios-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="pwa-apple-badge">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>iOS Yükleme Adımları</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Safari'den 3 adımda ekle</p>
                </div>
              </div>
              <button className="btn btn-secondary btn-icon-only" onClick={() => { setShowIosModal(false); if (onCloseForce) onCloseForce(); }}>
                <X size={18} />
              </button>
            </div>

            <div className="pwa-steps-list">
              {/* Step 1 */}
              <div className="pwa-step-card">
                <div className="pwa-step-num">1</div>
                <div className="pwa-step-content">
                  <div className="pwa-step-title">
                    <span className="pwa-highlight"><Share size={16} /> Paylaş</span> butonuna dokun
                  </div>
                  <div className="pwa-step-desc">
                    Ekranın altındaki Paylaş butonuna basın.
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="pwa-step-card">
                <div className="pwa-step-num">2</div>
                <div className="pwa-step-content">
                  <div className="pwa-step-title">
                    <span className="pwa-highlight"><PlusSquare size={16} /> Ana Ekrana Ekle</span> seç
                  </div>
                  <div className="pwa-step-desc">
                    Açılan menüden "Ana Ekrana Ekle"ye dokunun.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="pwa-step-card">
                <div className="pwa-step-num">3</div>
                <div className="pwa-step-content">
                  <div className="pwa-step-title">
                    Sağ üstteki <span className="pwa-highlight">Ekle</span> butonuna bas
                  </div>
                  <div className="pwa-step-desc">
                    Sağ üst köşedeki "Ekle" butonuna basın.
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button className="btn btn-primary btn-block" onClick={() => { setShowIosModal(false); if (onCloseForce) onCloseForce(); }}>
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback steps for non-iOS platforms when beforeinstallprompt is missing */}
      {showFallbackModal && (
        <div className="modal-backdrop" onClick={() => { setShowFallbackModal(false); if (onCloseForce) onCloseForce(); }}>
          <div className="modal-content animate-slide-up" style={{ maxWidth: '480px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800 }}>Uygulama Yükleme Rehberi</span>
              <button 
                onClick={() => { setShowFallbackModal(false); if (onCloseForce) onCloseForce(); }} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
              {fallbackPlatform === 'android' ? (
                <>
                  <div style={{ textAlign: 'center', margin: '10px 0' }}>
                    <Smartphone size={32} style={{ color: 'var(--accent-color)' }} />
                    <h4 style={{ margin: '8px 0', fontWeight: 700 }}>Android Kurulum Adımları</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>1</span>
                      <span>Tarayıcınızın (örn. Chrome) sağ üst köşesindeki **üç noktaya (⋮)** dokunun.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>2</span>
                      <span>Açılan menüden **"Ana Ekrana Ekle"** veya **"Uygulamayı Yükle"** seçeneğini seçin.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>3</span>
                      <span>Ekranda beliren onay kutusunda **"Yükle"** butonuna dokunun. Uygulama otomatik olarak telefonunuza yüklenecektir.</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', margin: '10px 0' }}>
                    <Download size={32} style={{ color: 'var(--accent-color)' }} />
                    <h4 style={{ margin: '8px 0', fontWeight: 700 }}>Masaüstü Kurulum Adımları</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>1</span>
                      <span>Tarayıcınızın adres çubuğunun (URL) sağ tarafındaki **"Yükle"** (Ekran ve Aşağı Ok simgesi) veya **üç noktaya (⋮)** tıklayın.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>2</span>
                      <span>Menüden **"TanCoreLab uygulamasını yükle"** veya **"Uygulamayı yükle..."** seçeneğini seçin.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>3</span>
                      <span>Karşınıza gelen pencerede **"Yükle"** butonuna basarak uygulamayı bilgisayarınıza bağımsız bir ekran/sekme olarak yükleyin.</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button 
                className="btn btn-primary btn-block" 
                onClick={() => { setShowFallbackModal(false); if (onCloseForce) onCloseForce(); }}
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
