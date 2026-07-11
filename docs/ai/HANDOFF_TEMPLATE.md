---
Last updated: 2026-07-11
Updated by: Antigravity
Related milestone: 3C-Bridge-A
Source of truth status: authoritative
---

# Yapay Zekâ Devir Protokolü (Handoff Template)

Bu dosya, yapay zekâ oturumları arasındaki geçişlerde bağlam (context) kaybını sıfırlamak için kullanılacak **Handoff** belgesi şablonudur.

Oturum sonlarında, yapay zekâ asistanı bu şablonun bir kopyasını doldurarak şu dizine kaydetmelidir:
`docs/ai/handoffs/YYYY-MM-DD-HHMM-handoff.md`

---

```markdown
# AI Handoff - [YYYY-MM-DD] [HH:MM]

## 1. Oturum Sorumluları (Session Metadata)
* **Date / Time**: [Tarih ve Saat]
* **Previous Agent**: [Devreden AI Asistanı]
* **Next Agent**: [Devralacak AI Asistanı]
* **Current Branch**: [Git Dalı - Örn: main]

---

## 2. Mevcut Hedef ve Durum (Objective & Status)
* **Current Objective**: [Bu oturumun ana hedefi neydi?]
* **Last Completed Milestone**: [En son başarıyla tamamlanan ana aşama]
* **Current Milestone**: [Şu an üzerinde çalışılan aktif aşama]
* **Last Completed Action**: [Oturum kapanmadan hemen önce yapılan son başarılı işlem]

---

## 3. Komut ve Doğrulama Durumları (Command Status)
* **Last Successful Commands**:
  - `[Çalışan başarılı komut 1]`
  - `[Çalışan başarılı komut 2]`
* **Last Failing Command (If Any)**: `[Varsa hata veren son komut ve mesajı]`
* **Current Database Status**: [Reset / Lint / pgTAP / Diff durumları - Örn: 60/60 PASS]
* **Current Flutter Status**: [Analyze ve widget test sonuçları - Örn: 20/20 PASS]

---

## 4. Dosya Değişiklikleri (File Operations)
* **Files Changed**:
  - `[Değiştirilen Dosya 1]` (Değişiklik gerekçesi)
  - `[Değiştirilen Dosya 2]` (Değişiklik gerekçesi)
* **Files NOT to Change**:
  - `[Dokunulmaması Gereken Kritik Dosyalar ve Nedenleri]`
* **Uncommitted Changes**: [Varsa commit edilmemiş yerel değişiklikler]

---

## 5. Riskler ve Engeller (Blockers & Risks)
* **Known Blockers**: [Geliştirmeyi tıkayan bağımlılıklar veya sorunlar]
* **Technical Debt Created**: [Bu oturumda bilerek bırakılan teknik borçlar]
* **Decisions Made**: [Bu oturumda alınan ve DECISIONS.md dosyasına eklenen kararlar]

---

## 6. Bir Sonraki Kesin Adım (Next Action)
* **Exact Next Action**: [Projeyi devralacak asistanın atacağı ilk kesin adım nedir?]
```
