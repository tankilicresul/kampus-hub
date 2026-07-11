---
Last updated: 2026-07-11
Updated by: Antigravity
Related milestone: 3C-Bridge-A
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
  - **Durum**: **Next / Not Started (Sıradaki Aşama / Başlatılmadı)**
  - **Bağımlılık**: 3C-Bridge-B2.2'nin tamamlanması.
* **Phase 3C-Bridge-B3 (Auth/Device Pilot Integration)**:
  - **Açıklama**: Auth pilot modülünün repository katmanı ile soyutlanması ve regresyon testleri.
  - **Durum**: **Beklemede (Pending)**
  - **Bağımlılık**: 3C-Bridge-B2.3'ün tamamlanması.
* **Phase 3C-Bridge-B4 (Documentation and Verification)**:
  - **Açıklama**: Dokümantasyon güncelleme ve doğrulama kapanışı.
  - **Durum**: **Beklemede (Pending)**
  - **Bağımlılık**: 3C-Bridge-B3'ün tamamlanması.

### C. Phase 3C-Bridge-C: Behavior-preserving Folder Refactor
* **Açıklama**: Mevcut Flutter kodunun davranış değişikliği yapılmadan feature-first modüler dizin yapısına taşınması.
* **Durum**: **Beklemede (Pending)**
* **Bağımlılık**: 3C-Bridge-B'nin tamamlanması.

### D. Phase 3C-Bridge-D: Repository Isolation
* **Açıklama**: UI ekranlarındaki ve Provider'lardaki doğrudan Supabase Client çağrılarının kaldırılıp, Repository interface'leri arkasına soyutlanması.
* **Durum**: **Beklemede (Pending)**
* **Bağımlılık**: 3C-Bridge-C'nin tamamlanması.

### E. Phase 3C-Bridge-E: Feature Flags & Graceful Degradation
* **Açıklama**: Özellik bayrakları altyapısının kurulması ve servis çökmeleri için fallback mekanizmalarının entegrasyonu.
* **Durum**: **Beklemede (Pending)**
* **Bağımlılık**: 3C-Bridge-D'nin tamamlanması.

### F. Phase 3C-Bridge-F: Documentation & Verification
* **Açıklama**: Modül README'lerinin tamamlanması, linter ve testlerin doğrulanması.
* **Durum**: **Beklemede (Pending)**
* **Bağımlılık**: 3C-Bridge-E'nin tamamlanması.

---

## 2. Orta Vadeli Yol Haritası (Workspace Integration)

### A. Milestone 3C-C: Flutter Onboarding & Switcher Entegrasyonu
* **Açıklama**: Onboarding ekran akışı, davet kabul/ret arayüzü, yeni workspace kurma ekranı ve Workspace Switcher yan menüsünün kodlanması.
* **Durum**: **Blocked (Engellendi - Bridge aşamaları tamamlanana kadar)**
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
