---
Last updated: 2026-07-11
Updated by: Antigravity
Related milestone: 3C-Bridge-A
Source of truth status: authoritative
---

# Kampüs Hub — Workflow Rules

Bu doküman, projede kod yazarken, veritabanını test ederken ve git süreçlerini yönetirken yapay zekâ asistanlarının ve geliştiricilerin uymakla yükümlü olduğu kuralları tanımlar.

---

## 1. Git ve Versiyon Kontrol Kuralları
* **Commit Onayı**: Yapay zekâ asistanı, kullanıcı açıkça onay vermedikçe `git commit` yapamaz. Commits sadece büyük dönüm noktalarında (milestone checkpoints) veya anlamlı geliştirme parçalarında tercih edilmelidir. Küçük adımlarda otomatik commit atılmamalıdır.
* **Push Onayı**: Kullanıcı açıkça "push yap" demedikçe `git push` çalıştırılmamalıdır.
* **Küçük Adımlarla İlerleme**: Değişiklikler tek seferde devasa dosyalar yerine parça parça yapılmalı ve her adım kullanıcı onayına sunulmalıdır.

---

## 2. Veritabanı ve Migration Kuralları
* **Eski Migration'ların Korunması**: Yerel ortamda derlenmiş veya production'a çıkmış hiçbir eski göç (migration) SQL dosyası geriye dönük olarak **değiştirilemez**. Şema değişiklikleri veya hata düzeltmeleri yeni bir takip migration dosyası ile uygulanmalıdır.
* **Sıralı Veritabanı Doğrulama Akışı**:
  Veritabanı üzerinde yapılan her değişiklikten sonra sırasıyla şu adımlar işletilmelidir:
  1. `npx supabase db reset` *(Şemanın sıfırdan hatasız kurulabildiğinin doğrulanması)*
  2. `npx supabase db lint --local --level warning --fail-on warning` *(Linter analizi)*
  3. `npx supabase test db` *(pgTAP birim ve entegrasyon testleri)*
  4. `npx supabase db diff --local` *(Şema eşitsizliklerinin kontrolü)*
* **Hata Durumunda Durma**: Bu adımlardan herhangi biri hata verirse, sonraki adıma kesinlikle geçilmemeli ve hata derhal çözülmelidir.

---

## 3. Yeniden Deneme (Retry) Politikası
Uygulama genelinde körü körüne "tüm API/RPC isteklerini 3 kez otomatik yeniden dene" kuralı **geçersizdir**. Yeniden deneme kuralları işleme göre özelleştirilmiştir:

* **Sadece Idempotent İşlemler**: Otomatik yeniden deneme (retry) yalnızca idempotent salt-okuma (read) işlemlerinde veya bir `idempotency_key` ile güvence altına alınmış yazma (write) işlemlerinde kullanılabilir.
* **Durum Değiştiren (State-changing) RPC Sınırları**: Workspace oluşturma (`create_workspace_with_owner`), davet kabul etme (`accept_current_user_workspace_invitation`), sahiplik devretme (`transfer_workspace_ownership`) ve üyelikten ayrılma (`leave_current_user_workspace`) gibi durum değiştiren hassas RPC'lerde **asla kör otomatik retry yapılmamalıdır**.
* **Belirsiz Zaman Aşımları (Timeout)**: Bir isteğin timeout olması durumunda işlemin sunucuda gerçekleşip gerçekleşmediği belirsiz ise, retry yapmadan önce sunucu durumu (`server state`) sorgulanarak doğrulanmalıdır.
* **Backoff & Jitter**: Otomatik denemeler arasında rastgele gecikmeler (jitter) ve üstel artış (exponential backoff) uygulanmalıdır. Deneme sayıları evrensel değildir; işlem türünün kritiklik seviyesine göre belirlenir.

---

## 4. Yapay Zekâ Davranış Kuralları
* **Gerçek Çıktı Takibi**: Yapay zekâ, kullanıcının terminal veya arayüz çıktısı olarak sunduğu gerçek veriler üzerinden ilerlemelidir. Varsayımlar üzerinden sonraki adımlara geçilmemelidir.
* **Hataları Gizlememe**: Testlerde hata çıktığında test beklentileri (assertions) veya veri tipleri hatayı gizleyecek şekilde gevşetilmemelidir. Hatanın kök nedeni production kodunda veya test fixture kurulumunda aranmalıdır.
* **Ürün Kararlarını Koruma**: Kararlaştırılan ürün iş kuralları kullanıcı onayı olmadan kod kolaylığı için değiştirilmemelidir.
