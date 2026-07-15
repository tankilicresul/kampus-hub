---
Last updated: 2026-07-12
Updated by: Antigravity
Related milestone: 3C-C
Source of truth status: authoritative
---

# Kampüs Hub — Roadmap

Bu doküman, projenin kısa ve uzun vadeli geliştirme adımlarını, aşamaların durumlarını ve birbirlerine olan bağımlılıklarını tanımlar.

---

## 1. Kısa Vadeli Yol Haritası (Bridge & Workspace Refactor)

### A. Phase 3C-Bridge-A: AI Memory Documents
* **Açıklama**: `docs/ai/` klasörünün oluşturulması ve 12 temel yapay zekâ hafıza dosyasının yazılması.
* **Durum**: **Completed (Tamamlandı)**
* **Bağımlılık**: Yok.

### B. Phase 3C-Bridge-B: AppFailure, Result & Architecture Boundaries
* **Phase 3C-Bridge-B1 (Pure Dart AppFailure and AppResult Contracts)**:
  - **Açıklama**: `app_failure.dart` ve `app_result.dart` sözleşmelerinin yazılması ve Dart unit testleri.
  - **Durum**: **Completed (Tamamlandı)**
  - **Bağımlılık**: 3C-Bridge-A'nın tamamlanması.
* **Phase 3C-Bridge-B2.1 (Central Failure Mapper)**:
  - **Açıklama**: Ham teknik exception nesnelerini `AppFailure` tiplerine dönüştüren `FailureMapper` ve birim testleri.
  - **Durum**: **Completed (Tamamlandı)**
  - **Bağımlılık**: 3C-Bridge-B1'in tamamlanması.
* **Phase 3C-Bridge-B2.2 (Retry and Timeout Policies)**:
  - **Açıklama**: İşlem tiplerine göre otomatik deneme (`RetryPolicy`) ve zaman aşımı (`TimeoutPolicy`) kurallarının implementasyonu.
  - **Durum**: **Completed (Tamamlandı)**
  - **Bağımlılık**: 3C-Bridge-B2.1'in tamamlanması.
* **Phase 3C-Bridge-B2.3 (AppLogger and Redaction)**:
  - **Açıklama**: Ortak loglama kontratı (`AppLogger`) ve kişisel veri maskeleme kurallarının yazılması.
  - **Durum**: **Completed (Tamamlandı)**
  - **Bağımlılık**: 3C-Bridge-B2.2'nin tamamlanması.
* **Phase 3C-Bridge-B3 (Auth/Device Pilot Integration)**:
  - **Açıklama**: Auth pilot modülünün repository katmanı ile soyutlanması ve regresyon testleri.
  - **Durum**: **Completed (Tamamlandı)**
  - **Bağımlılık**: 3C-Bridge-B2.3'ün tamamlanması.
* **Phase 3C-Bridge-B4 (Documentation and Verification)**:
  - **Açıklama**: Dokümantasyon güncelleme ve doğrulama kapanışı.
  - **Durum**: **Completed (Tamamlandı)**
  - **Bağımlılık**: 3C-Bridge-B3'ün tamamlanması.

### [Completed / Tamamlandı] Phase 3C-Bridge-C: Flutter Folder Refactor (No Behavior Change)
* **Hedef**: Uygulamanın davranış değişikliği yapılmadan Clean Architecture Feature-First klasör yapısına taşınması.
* **Durum**: Tamamlandı (12 Temmuz 2026).

### [Completed / Tamamlandı] Phase 3C-Bridge-D: Repository Isolation
* **Hedef**: UI katmanındaki Supabase Client çağrılarının kaldırılması ve Repository arayüzleri arkasına taşınması.
* **Alt Aşamalar**:
  - **Phase 3C-Bridge-D1 (Provider Dependency Extraction)**: **Completed (Tamamlandı)** (Riverpod provider'ları DI dosyasına taşındı, presentation altyapı bağımlılıkları temizlendi).
  - **Phase 3C-Bridge-D2 (Dependency-Boundary Verification)**: **Completed (Tamamlandı)** (Kalan altyapı bağımlılıklarının analizi yapıldı, ek soyutlamaya gerek kalmadan presenter'ın tamamen izole olduğu tescil edildi).
* **Durum**: **Completed (Tamamlandı)** (12 Temmuz 2026).

### [Completed / Tamamlandı] Phase 3C-Bridge-E: Feature Flags & Graceful Degradation
* **Açıklama**: Özellik bayrakları altyapısının kurulması ve servis çökmeleri için fallback mekanizmalarının entegrasyonu.
* **Durum**: **Completed (Tamamlandı)** (12 Temmuz 2026).

### [Completed / Tamamlandı] Phase 3C-Bridge-F: Documentation & Verification
* **Açıklama**: Modül README'lerinin tamamlanması, linter ve testlerin doğrulanması, final tutarlılık raporunun hazırlanması.
* **Durum**: **Completed (Tamamlandı)** (12 Temmuz 2026).

### [Completed / Tamamlandı] Milestone 3C-C: Flutter Onboarding & Switcher Entegrasyonu
* **Açıklama**: Kullanıcının workspace üyeliği yoksa onboarding adımı, davet onaylama/reddetme sayfaları ve yan menü workspace değiştirici arayüz entegrasyonu.
* **Durum**: **Completed (Tamamlandı)**
* **Bağımlılık**: 3C-Bridge-F'nin tamamlanması.

---

## 2. Orta Vadeli Yol Haritası (Workspace Integration)

### A. Milestone 3C-C: Flutter Onboarding & Switcher Entegrasyonu
* **Açıklama**: Onboarding ekran akışı, davet kabul/ret arayüzü, yeni workspace kurma ekranı ve Workspace Switcher yan menüsünün kodlanması.
* **Durum**: **Completed (Tamamlandı)**
* **Bağımlılık**: 3C-Bridge (Tüm A-F köprü fazlarının) tamamlanması zorunludur.

### B. Milestone 3D: Real OAuth & MFA Entegrasyonu
* **Açıklama**: Canlı ortam Google OAuth sertifikalarının bağlanması ve mobil biometric/MFA enrollment akışlarının tamamlanması.
* **Durum**: **Planlandı (Planned)**
* **Bağımlılık**: Milestone 3C-C'nin tamamlanması.

---

## 3. Uzun Vadeli Yol Haritası (Launch & Operations)

### A. Production Deployment & Secrets Management
* **Açıklama**: Canlı Supabase PostgreSQL şemasının kurulması ve ortam değişkenlerinin (secrets) güvenli yönetimi.
* **Durum**: **Beklemede (Pending)**
* **Bağımlılık**: Milestone 3D'nin tamamlanması.

### B. Android Closed Testing (Google Play Store)
* **Açıklama**: Uygulamanın Play Store kapalı test sürümünün yayına alınması ve test süreçleri.
* **Durum**: **Beklemede (Pending)**
* **Bağımlılık**: Production Deployment tamamlanması.

### C. iOS TestFlight Verification
* **Açıklama**: Apple Developer hesabı üzerinden iOS derlemesinin TestFlight ortamında doğrulanması.
* **Durum**: **Beklemede (Pending)**
* **Bağımlılık**: Android Closed Testing tamamlanması.
