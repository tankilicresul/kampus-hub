---
Last updated: 2026-07-11
Updated by: Antigravity
Related milestone: 3C-Bridge-A
Source of truth status: authoritative
---

# Kapında Hub — Technical Debt

Bu doküman, projede bilinçli olarak ertelenen teknik borçları, bunların risklerini ve çözüm planlarını içerir.

---

## 1. Veritabanı ve Şema Borçları

### A. `tasks.supporters` UUID Array Yapısı
* **Etki**: Görev destekçileri `tasks` tablosunda `UUID[]` formatında saklanır.
* **Risk**: Destekçilerin katılım tarihi, geçmişi, rolleri takip edilemez ve karmaşık RLS kuralları işletilemez.
* **Aciliyet**: Orta
* **Geçici Kabul Gerekçesi**: MVP aşamasında hızlı teslimat sağlamak ve ara tablo JOIN maliyetlerinden kaçınmak.
* **Planlanan Aşama**: MVP Sonrası (Faz 4). Görev destekçileri `task_assignees` adında ayrı bir ilişki tablosuna taşınacaktır.

### B. Legacy Profiles ve Allowlist Yapıları
* **Bileşenler**: `profiles.role` kolonu, `profiles.university_id` kolonu, `access_invitations` tablosu, `check_current_user_access` RPC'si.
* **Etki**: Veritabanında gereksiz yer kaplarlar ve kafa karışıklığı oluştururlar.
* **Risk**: Eski kodların yanlışlıkla tetiklenmesi veya yeni geliştiricilerin eski kolonları kullanmaya çalışması.
* **Aciliyet**: Düşük
* **Geçici Kabul Gerekçesi**: Mobil uygulama GoRouter guard ve onboarding geçişleri tamamlanana kadar geriye dönük uyumluluk sağlanması zorunluluğu.
* **Planlanan Aşama**: Milestone 3C-C sonrasında, Flutter entegrasyonu tamamen tamamlandığında bu alanlar veritabanından tamamen silinecektir.

---

## 2. Mobil Uygulama ve Mimari Borçlar

### A. Flutter Modüler Refaktörü (Feature-First)
* **Etki**: Kod tabanının Clean Architecture standartlarına göre ayrılmamış olması.
* **Risk**: Uygulama büyüdükçe spagetti koda dönüşme ve dairesel bağımlılıklar (circular dependency) oluşması.
* **Aciliyet**: Yüksek
* **Geçici Kabul Gerekçesi**: Veritabanı ve temel auth yapısının kararlı hale gelmesini beklemek.
* **Planlanan Aşama**: Milestone 3C-Bridge-C aşamasında çözülecektir.

### B. Repository Soyutlama Katmanı
* **Etki**: Ekranların doğrudan Supabase client'a bağımlı olması.
* **Risk**: Mock test yazımını engeller ve gelecekteki yerel önbellek (offline cache) geçişlerini zorlaştırır.
* **Aciliyet**: Yüksek
* **Geçici Kabul Gerekçesi**: Arayüz refaktörünü veri katmanından ayırmak.
* **Planlanan Aşama**: Milestone 3C-Bridge-D aşamasında çözülecektir.

### C. Loglama, Exectuor ve Pilot Entegrasyon Katmanları (Hata Yönetimi Kalanı)
* **Bileşenler**: `AppFailure`, `AppResult`, `FailureMapper`, **`RetryPolicy`** ve **`TimeoutPolicy`** çözülmüştür (Completed). Ancak `AppLogger` (log sarmalayıcı ve hassas veri maskeleme), retry executor entegrasyonu, server-state verification doğrulama akışları ve auth pilot adaptasyonları henüz yapılmamıştır.
* **Etki**: Loglarda hassas verilerin (JWT, şifre, email vb.) maskelenmeden yazılması riski ve otomatik deneme kurallarını Future çağrıları seviyesinde koşturacak bir executor katmanı ihtiyacı.
* **Risk**: Siber güvenlik ihlalleri (ham veri log sızıntısı) ve veri katmanında repository soyutlama eksikliği.
* **Aciliyet**: Yüksek
* **Geçici Kabul Gerekçesi**: Sözleşmeler, mapper ve politikalar kurulmuş olup, loglama Bridge-B2.3, pilot repository/notifier entegrasyonu Bridge-B3 aşamasında tamamlanacaktır.
* **Planlanan Aşama**: Milestone 3C-Bridge-B2.3 ve B3.

### D. Feature Flags ve Çevrimdışı (Offline Cache) Stratejisi
* **Etki**: Modüllerin çalışma durumlarını dinamik kapatma ve çevrimdışı çalışma desteğinin olmaması.
* **Risk**: İnternet koptuğunda veya bir servis hata verdiğinde uygulamanın tamamen kilitlenmesi.
* **Aciliyet**: Orta
* **Geçici Kabul Gerekçesi**: Önceliğin çoklu kiralama veri güvenliğine verilmiş olması.
* **Planlanan Aşama**: Milestone 3C-Bridge-E aşamasında çözülecektir.

---

## 3. Operasyonel ve Canlı Ortam Borçları

### A. Production Secrets ve Account Transfer
* **Etki**: Google OAuth istemci sırlarının ve veritabanı şifrelerinin yerel ortam dışına taşınamamış olması.
* **Risk**: Canlı ortam kurulumunda (deployment) yapılandırma hataları ve ana Owner hesabının devredilmesinde yaşanabilecek güvenlik açıkları.
* **Aciliyet**: Düşük
* **Geçici Kabul Gerekçesi**: MVP'nin yerel ortamda tamamen kararlı ve test edilmiş olmasının öncelikli olması.
* **Planlanan Aşama**: Canlı ortama çıkış (Deployment) aşaması.
