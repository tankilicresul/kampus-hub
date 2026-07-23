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

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // 3. Listen for Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (!standalone && !dismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Auto-show for iOS if not installed & not dismissed
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (iosDevice && !standalone && !dismissed) {
      // Small delay for smooth user experience on load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1200);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
        setShowBanner(true);
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
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else {
      // Fallback if beforeinstallprompt wasn't triggered yet or browser doesn't support it
      setShowIosModal(true);
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
                  <Sparkles size={12} /> Native Uygulama Hissi
                </div>
                <h3 className="pwa-title">Kampüs Hub'ı Telefonuna Yükle!</h3>
                <p className="pwa-subtitle">
                  Tek tıkla ana ekranına ekle, tıpkı App Store / Google Play uygulaması gibi ışık hızında kullan.
                </p>
              </div>
            </div>

            {/* Platform Feature List */}
            <div className="pwa-features-grid">
              <div className="pwa-feature-item">
                <CheckCircle2 size={16} className="pwa-check-icon" />
                <span>Çevrimdışı / Hızlı Erişim</span>
              </div>
              <div className="pwa-feature-item">
                <CheckCircle2 size={16} className="pwa-check-icon" />
                <span>Tam Ekran Native Deneyim</span>
              </div>
              <div className="pwa-feature-item">
                <CheckCircle2 size={16} className="pwa-check-icon" />
                <span>Anlık Bildirim & Güncellemeler</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pwa-actions">
              <button className="btn btn-primary pwa-main-btn" onClick={handleInstallClick}>
                <Download size={18} />
                <span>{isIOS ? 'iOS Yükleme Rehberini Aç' : 'Uygulamayı Hemen İndir'}</span>
                <ArrowRight size={16} />
              </button>
              <button className="btn btn-ghost pwa-sub-btn" onClick={handleDismiss}>
                Daha Sonra Hatırlat
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
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Apple iOS Yükleme Adımları</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Safari tarayıcısından 3 adımda ana ekrana ekle</p>
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
                    Alt Menüdeki <span className="pwa-highlight"><Share size={16} /> Paylaş</span> Simgesine Dokun
                  </div>
                  <div className="pwa-step-desc">
                    Safari ekranının en altındaki ortada yer alan kare ve yukarı ok (Paylaş) butonuna basın.
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="pwa-step-card">
                <div className="pwa-step-num">2</div>
                <div className="pwa-step-content">
                  <div className="pwa-step-title">
                    <span className="pwa-highlight"><PlusSquare size={16} /> Ana Ekrana Ekle</span> Seçeneğini Bul
                  </div>
                  <div className="pwa-step-desc">
                    Açılan paylaşım listesini aşağı doğru kaydırıp "Ana Ekrana Ekle" seçeneğine dokunun.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="pwa-step-card">
                <div className="pwa-step-num">3</div>
                <div className="pwa-step-content">
                  <div className="pwa-step-title">
                    Sağ Üstteki <span className="pwa-highlight">Ekle</span> Butonuna Bas
                  </div>
                  <div className="pwa-step-desc">
                    Açılan pencerede sağ üst köşedeki "Ekle" yazısına tıklayın. Kampüs Hub doğrudan ana ekranınıza bir uygulama olarak yüklenecektir!
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button className="btn btn-primary btn-block" onClick={() => { setShowIosModal(false); if (onCloseForce) onCloseForce(); }}>
                Anlaşıldı, Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
