---
Last updated: 2026-07-11
Updated by: Antigravity
Related milestone: 3C-Bridge-A
Source of truth status: authoritative
---

# Kapında Hub — AI Start Here

Yapay zekâ asistanları ve yeni geliştiriciler için Kapında Hub projesine giriş ve çalışma protokolü rehberidir.

---

## 1. Proje ve Ürün Tanımı
* **Proje Adı**: Kapında Hub
* **Ürün**: Çoklu çalışma alanı (multi-workspace/multi-tenant) destekli, saha ekipleri ve operasyon yönetimi odaklı mobil SaaS uygulaması.
* **Mobil Teknoloji**: Flutter (Dart)
* **Backend**: Supabase (PostgreSQL, RLS yetkilendirmesi, pgTAP testleri, RPC API'leri)
* **İlk Çalışma Alanı**: Kampüs Kapında (Varsayılan ID: `'df39e73b-bf72-4d1a-9694-82bd8996b797'`)
* **Hedef Platformlar**: Android (Emulator/Cihaz doğrulandı) ve iOS (Gelecekte doğrulanacak)

---

## 2. Yapay Zekâ Okuma Sırası (Required Read Order)
Yeni bir yapay zekâ oturum başladığında projeyi anlamak için **kesinlikle** sırasıyla şu belgeleri okumalıdır:
1. `docs/ai/AI_START_HERE.md` *(Bu dosya)*
2. `docs/ai/project-state.json` *(Makine tarafından okunabilir kararlı durum verisi)*
3. `docs/ai/CURRENT_STATE.md` *(Mevcut durum ve sonraki adım)*
4. `docs/ai/PROJECT_MEMORY.md` *(Ürün ve iş modeli kuralları)*
5. `docs/ai/DECISIONS.md` *(ADR - Alınan mimari kararlar)*
6. `docs/ai/ARCHITECTURE_MAP.md` *(Klasör ve şema haritası)*
7. `docs/ai/WORKFLOW_RULES.md` *(Geliştirme, git ve test kuralları)*
8. `docs/ai/TEST_STATUS.md` *(Son test durumları)*
9. `docs/ai/KNOWN_ISSUES.md` *(Açık buglar)*
10. `docs/ai/TECHNICAL_DEBT.md` *(Teknik borçlar)*
11. `task.md` *(Genel TODO takibi)*

---

## 3. Katı Çalışma Protokolü (Mandatory Workflow Rules)
* **Kullanıcı Teknik Değildir**: Tüm açıklamalar anlaşılır, teknik jargondan uzak olmalıdır. Yapılacak işlemler küçük ve tek tek (incremental) sunulmalıdır.
* **Görsel/Çıktı Doğrulaması**: Kullanıcı terminal çıktısı veya ekran görüntüsü doğrulaması göndermeden bir sonraki aşamaya geçilmemelidir.
* **Commit Onayı**: Kullanıcı açıkça onay vermeden git commit yapılmamalıdır.
* **Push Onayı**: Kullanıcı açıkça "push yap" demeden GitHub push yapılmamalıdır.
* **Otomatik Başlatma Yasağı**: Bir milestone tamamlandığında sıradaki milestone kullanıcı onayı olmadan otomatik olarak başlatılmamalıdır.
* **Migration Koruma**: Eski göç (migration) SQL dosyaları geriye dönük olarak kesinlikle düzenlenmemelidir. Değişiklikler yeni bir takip migration'ı ile yapılmalıdır.
* **Test Önceliği**: Testler başarısız durumdayken yeni bir geliştirme veya doğrulama adımına geçilmemelidir. Test beklentileri production hatalarını gizlemek için asla zayıflatılmamalıdır.
* **Karar Güncelleme**: Ürün veya mimari kuralları değişirse `docs/ai/DECISIONS.md` güncellenmelidir.
* **Milestone Sonu Güncellemesi**: Her milestone bittiğinde `CURRENT_STATE.md`, `TEST_STATUS.md` ve `project-state.json` güncellenmelidir.
* **Bulut Onayı**: Kullanıcının açık izni olmadan Production Supabase ortamına deployment yapılmamalıdır.

---

## 4. Mevcut Kontrol Noktası (Current Checkpoint)
* **Milestone 3C-B**: Başarıyla tamamlandı ve doğrulandı (60 pgTAP testi PASS).
* **Milestone 3C-Bridge-A**: Şu an uygulanıyor (AI Memory belgeleri oluşturuluyor).
* **Milestone 3C-C**: Henüz başlatılmadı.
