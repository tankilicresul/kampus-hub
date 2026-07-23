# Milestone 3C-Bridge-B Implementation Plan
## Architecture Boundaries, AppFailure and Result Contracts

Bu doküman, Kapında Hub mobil uygulamasının veri katmanı ve hata yönetim mimarisini Clean Architecture sınırlarına göre soyutlamak üzere uygulanacak teknik yol haritasını içerir.

---

## 1. Current Flutter Architecture Audit (Mevcut Mimari Denetimi)

Mevcut Flutter projesinin (`apps/mobile/lib`) kod yapısı incelenmiş ve aşağıdaki durumlar gözlemlenmiştir:
- **Feature Yapısı**: Yalnızca `auth` özelliği mevcuttur. Arayüz ve iş mantığı `features/auth/presentation/` dizini altında toplanmıştır.
- **Sorumluluk Çakışması**: `AuthStateNotifier` hem arayüz durumunu (state) yönetmekte, hem doğrudan `SupabaseClient` ile ağ çağrıları yapmakta, hem `FlutterSecureStorage` ile yerel cihaz verisini saklamakta, hem de `DeviceInfoPlugin` ile donanım kimliği sorgulamaktadır.
- **Hata Yönetimi**: Hatalar `try-catch` blokları içinde yakalanıp doğrudan `e.toString()` biçiminde arayüzün (Presentation) `AuthState.error` alanına aktarılmakta ve ham hata olarak ekranda gösterilmektedir.

---

## 2. Identified Coupling and Failure Risks (Bağımlılık ve Çökme Riskleri)

| Dosya Yolu | Tespit Edilen Riskler ve Bağımlılıklar |
| :--- | :--- |
| [auth_state_notifier.dart](file:///C:/Projects/kampus-hub/apps/mobile/lib/features/auth/presentation/auth_state_notifier.dart) | - Arayüz katmanında ham `SupabaseClient` bağımlılığı.<br>- `PostgrestException` ve `AuthException` sızıntısı riski (Ham database veya ağ hata detaylarının ekranda görünmesi).<br>- `registerDevice()`, `loadActiveDevices()`, `revokeDevice()` metotlarında ham RPC isteklerinin yönetimi.<br>- Donanım hash'leme ve `sha256` işlemlerinin doğrudan presentation içinde yapılması. |
| [app_router.dart](file:///C:/Projects/kampus-hub/apps/mobile/lib/core/router/app_router.dart) | - Yönlendirme (redirect) kurallarında `AuthState.role` ve `AuthState.status` sorgulamaları yapılıyor. Arayüz geçişleri ile iş mantığı sıkı bağlıdır.<br>- Neyse ki router içinde doğrudan RPC veri yazma/mutasyon işlemi bulunmamaktadır. |
| [auth_test.dart](file:///C:/Projects/kampus-hub/apps/mobile/test/auth_test.dart) | - Testlerde kullanılan `FakeSecureStorage` dışında ağ katmanını soyutlayan fake repository yapıları mevcut değildir. |
| [widget_and_router_test.dart](file:///C:/Projects/kampus-hub/apps/mobile/test/widget_and_router_test.dart) | - `FakeAuthStateNotifier`, `FakeSupabaseClient` ve `FakeGoTrueClient` gibi karmaşık el-yapımı (handcrafted) mock sınıfları kullanılmaktadır. Bu durum testlerin bakımını zorlaştırır. |

---

## 3. AppFailure Model (Hata Sınıfları Hiyerarşisi)

Ağ, veri tabanı ve platform özelindeki tüm hataları tek tipleştirmek için `apps/mobile/lib/core/errors/app_failure.dart` altında Dart sealed class yapısı kurulacaktır. Model, toplam **11 temel failure türü** içermektedir:

```dart
sealed class AppFailure {
  final String userMessage;
  final String technicalMessage;
  final String? code;
  final bool retryHint; // Kesin retry kararı değil, sadece teknik bir ipucudur.

  const AppFailure({
    required this.userMessage,
    required this.technicalMessage,
    this.code,
    this.retryHint = false,
  });
}

class NetworkFailure extends AppFailure {
  const NetworkFailure({required String technicalMessage})
      : super(
          userMessage: 'İnternet bağlantısı kesildi. Lütfen ağınızı kontrol edin.',
          technicalMessage: technicalMessage,
          retryHint: true,
        );
}

class TimeoutFailure extends AppFailure {
  const TimeoutFailure({required String technicalMessage})
      : super(
          userMessage: 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.',
          technicalMessage: technicalMessage,
          retryHint: true,
        );
}

class ServiceUnavailableFailure extends AppFailure {
  const ServiceUnavailableFailure({required String technicalMessage})
      : super(
          userMessage: 'Sunucu servisi geçici olarak kullanım dışı. Lütfen daha sonra tekrar deneyin.',
          technicalMessage: technicalMessage,
          retryHint: true,
        );
}

class AuthenticationFailure extends AppFailure {
  const AuthenticationFailure({required String userMessage, required String technicalMessage, String? code})
      : super(
          userMessage: userMessage,
          technicalMessage: technicalMessage,
          code: code,
          retryHint: false,
        );
}

class PermissionFailure extends AppFailure {
  const PermissionFailure({required String userMessage, required String technicalMessage, String? code})
      : super(
          userMessage: userMessage,
          technicalMessage: technicalMessage,
          code: code,
          retryHint: false,
        );
}

class ValidationFailure extends AppFailure {
  const ValidationFailure({required String userMessage, required String technicalMessage, String? code})
      : super(
          userMessage: userMessage,
          technicalMessage: technicalMessage,
          code: code,
          retryHint: false,
        );
}

class ConflictFailure extends AppFailure {
  const ConflictFailure({required String userMessage, required String technicalMessage, String? code})
      : super(
          userMessage: userMessage,
          technicalMessage: technicalMessage,
          code: code,
          retryHint: false,
        );
}

class DatabaseFailure extends AppFailure {
  const DatabaseFailure({required String technicalMessage, String? code})
      : super(
          userMessage: 'Veritabanı işlemi gerçekleştirilemedi. Lütfen teknik ekiple iletişime geçin.',
          technicalMessage: technicalMessage,
          code: code,
          retryHint: false,
        );
}

class DeviceSecurityFailure extends AppFailure {
  const DeviceSecurityFailure({required String userMessage, required String technicalMessage})
      : super(
          userMessage: userMessage,
          technicalMessage: technicalMessage,
          retryHint: false,
        );
}

class ConfigurationFailure extends AppFailure {
  const ConfigurationFailure({required String technicalMessage})
      : super(
          userMessage: 'Uygulama yapılandırma hatası. Lütfen anahtar dosyalarını kontrol edin.',
          technicalMessage: technicalMessage,
          retryHint: false,
        );
}

class UnknownFailure extends AppFailure {
  const UnknownFailure({required String technicalMessage})
      : super(
          userMessage: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
          technicalMessage: technicalMessage,
          retryHint: false,
        );
}
```

### NetworkFailure ve ServiceUnavailableFailure Farkı:
- **`NetworkFailure`**: Doğrudan istemcinin internet bağlantısı veya ağ erişimi ile ilgilidir (Cihazın internetinin olmaması, sinyal kopması vb.).
- **`ServiceUnavailableFailure`**: Ağ mevcut olsa bile hedef servisin (Supabase veya dış API) HTTP 502/503/504 vermesi, bakım modunda olması veya geçici olarak hizmet verememesi durumlarında kullanılır.

---

## 4. AppResult Model (Başarı/Hata Sarmalayıcı Kontratı)

Ağ ve veritabanı işlemlerinin sonucunu tek bir nesnede sarmalamak için `apps/mobile/lib/core/result/app_result.dart` oluşturulacaktır. Herhangi bir harici kütüphane bağımlılığı eklememek adına **saf Dart sealed class** yapısı kullanılacaktır.

Varyant adları çakışmayı önlemek için netleştirilmiştir:
* **`sealed class AppResult<T>`**: Genel sonuç sarmalayıcı sınıfı.
* **`class AppSuccess<T>`**: Başarılı işlem sonucunu (`T data`) sarmalayan varyant.
* **`class AppError<T>`**: Başarısız işlem sonucunu ve buna ait `AppFailure failure` nesnesini barındıran varyant.

### `AppError<T>` ve `AppFailure` Arasındaki Fark:
- **`AppError<T>`**: İşlemin başarısız bittiğini belirten **sonuç varyantıdır** (İşlem akışı dönüş tipidir).
- **`AppFailure`**: Başarısızlığın iş mantığı (domain) ve teknik sebeplerini (hata kodu, mesajlar vb.) sınıflandıran **hata nesnesidir**.

```dart
sealed class AppResult<T> {
  const AppResult();

  R fold<R>({
    required R Function(T data) onSuccess,
    required R Function(AppFailure failure) onFailure,
  });

  bool get isSuccess => this is AppSuccess<T>;
  bool get isError => this is AppError<T>;

  T? get dataOrNull => fold(
        onSuccess: (data) => data,
        onFailure: (_) => null,
      );

  AppFailure? get failureOrNull => fold(
        onSuccess: (_) => null,
        onFailure: (failure) => failure,
      );

  AppResult<R> map<R>(R Function(T data) transform) {
    return fold(
      onSuccess: (data) => AppSuccess<R>(transform(data)),
      onFailure: (failure) => AppError<R>(failure),
    );
  }

  AppResult<T> mapError(AppFailure Function(AppFailure failure) transform) {
    return fold(
      onSuccess: (data) => AppSuccess<T>(data),
      onFailure: (failure) => AppError<T>(transform(failure)),
    );
  }
}

class AppSuccess<T> extends AppResult<T> {
  final T data;
  const AppSuccess(this.data);

  @override
  R fold<R>({
    required R Function(T data) onSuccess,
    required R Function(AppFailure failure) onFailure,
  }) {
    return onSuccess(data);
  }
}

class AppError<T> extends AppResult<T> {
  final AppFailure failure;
  const AppError(this.failure);

  @override
  R fold<R>({
    required R Function(T data) onSuccess,
    required R Function(AppFailure failure) onFailure,
  }) {
    return onFailure(failure);
  }
}
```

---

## 5. Failure Mapping Strategy (Hata Dönüştürme Stratejisi)

*Not: Bu strateji Bridge-B2 aşamasında kodlanacaktır, Bridge-B1 kapsamında sadece kurallar planlanmaktadır.*

Supabase, PostgreSQL ve platform kütüphanelerinden fırlatılan ham exception nesneleri, veri katmanından (data sources/repositories) çıkmadan önce merkezi `FailureMapper` aracılığıyla `AppFailure` türlerine dönüştürülecektir.

```dart
class FailureMapper {
  static AppFailure fromException(Object exception) {
    // mapped in Bridge-B2
...
  }
}
```

### P0001 (Custom Database Domain Exception) Eşleme Stratejisi:
- Gelecekte Supabase RPC ve tetikleyici fonksiyonları makine tarafından okunabilir yapısal hata kodları (örn: `ERR_MEMBER_NOT_FOUND`, `ERR_OWNER_GUARD_VIOLATION`) üretmelidir.
- `FailureMapper` hata dönüştürme yaparken **öncelikle bu yapısal hata kodlarını (domain error codes) denetleyecektir**.
- Eğer yapısal hata kodu bulunmuyorsa, ikincil öncelikli olarak kontrollü mesaj metni eşleme (pattern matching) uygulanacaktır.
- Bilinmeyen veya eşleşmeyen P0001 hata mesajları **asla otomatik olarak `PermissionFailure` sayılmayacak**, güvenli varsayılan hata olarak **`DatabaseFailure`** veya **`UnknownFailure`** olarak sınıflandırılacaktır.
- Ham veritabanı hata mesajı kesinlikle UI katmanına sızdırılmayacaktır.

---

## 6. User-Message and Technical-Log Separation (Mesaj ve Log Ayrımı)

Siber güvenliği korumak ve veritabanı sızıntılarını önlemek amacıyla arayüze gösterilen mesaj ile arka planda loglanan teknik veriler birbirinden ayrılmıştır:
- **Arayüz Mesajı (`userMessage`)**: Kullanıcının aksiyon almasını sağlayan sade Türkçe dilde yazılmış hata bildirimleridir. Veritabanı tablo adları, SQL şema kolonları, UUID'ler veya ham PostgreSQL hata kodları **asla** bu mesajlarda yer alamaz.
- **Teknik Detay (`technicalMessage`)**: Sadece geliştiricinin görebileceği ve debug ortamında `AppLogger` aracılığıyla loglanan teknik hata detayı, stack trace ve hata kodudur.
- **Log Filtreleme**: Log verisi basılmadan önce kişisel veriler (email, raw invitation tokens, authentication tokens, biometrics keys) maskelenmeli veya çıkarılmalıdır.

---

## 7. Retry and Timeout Policy (Zaman Aşımı ve Yeniden Deneme)

Yeniden deneme (retry) kararları hata sınıflarından ayrılmıştır. Hata sınıflarındaki `retryHint` alanı sadece teknik bir tavsiyedir. Kesin retry kararı **`RetryPolicy`** sınıfı tarafından aşağıdaki girdiler birleştirilerek verilecektir:

### Retry Karar Parametreleri:
1. **İşlem Sınıfı (Operation Class)**:
   - `safeRead`: Salt-okuma işlemleri. Otomatik retry en geniştir.
   - `idempotentWrite`: Idempotency anahtarı ile korunan yazmalar. Otomatik retry güvenlidir.
   - `nonIdempotentWrite`: Durum değiştiren hassas yazmalar (Örn: `create_workspace_with_owner`, `accept_invitation`). **Asla otomatik retry yapılamaz**.
   - `securitySensitive`: Şifre, OTP, MFA doğrulama işlemleri. Otomatik retry yapılamaz.
   - `localDeviceOperation`: Biyometri ve yerel dosya işlemleri.
2. **Hata Türü (Failure Type)**: Sadece `NetworkFailure`, `TimeoutFailure` veya `ServiceUnavailableFailure` ise yeniden denenebilir.
3. **Mevcut Deneme Sayısı (Attempt Count)**.
4. **Server State Verification Availability**: Timeout durumunda sunucu durumunu kontrol eden metodun olup olmadığı.

### Timeout Sonrası İş Mantığı:
Durum değiştiren işlemlerde timeout alındığında, kullanıcı manuel butona tekrar basmadan önce arkaplanda refresh veya state read çalıştırılarak işlemin yapılıp yapılmadığı kontrol edilir. Belirsizlik durumunda "İşlem durumu sorgulanıyor" ara yüklemesi gösterilir.

Mevcut auth RPC'lerindeki 10 saniyelik timeout kuralı korunacak, ancak ham timeout istisnaları aşıldığında doğrudan `TimeoutFailure` sarmalaması ile yönetilecektir.

---

## 8. Logging Contract (Loglama Kontratı)

Saf Dart `AppLogger` soyutlaması planlanmıştır:
- `debug(String message, [Object? error, StackTrace? stackTrace])`
- `info(String message)`
- `warning(String message, [Object? error])`
- `error(String message, [Object? error, StackTrace? stackTrace])`

### Güvenlik Kuralları:
* E-posta adresleri maskelenir (`us***@domain.com`).
* Oturum anahtarları, şifreler ve ham davet token'ları kesinlikle loglanmaz.

---

## 9. Layer Dependency Rules (Katman Bağımlılık Sınırları)

- **Presentation**: Ham `SupabaseClient` kullanamaz. Sadece `Domain` repository sözleşmeleriyle konuşur.
- **Domain**: Flutter UI, Riverpod veya Supabase paketlerine bağımlılığı olamaz. Saf Dart kütüphanesidir.
- **Data**: Ham SQL/Postgres hatalarını `FailureMapper` ile `AppFailure` modellerine dönüştürür.
- **Router**: Yönlendirme mantığında veri mutasyonu veya RPC çağrıları yapamaz.

---

## 10. Auth/Device Pilot Integration (Auth/Cihaz Pilot Entegrasyonu)

Bridge-B3 aşamasında `auth` modülü bu mimariye taşınacaktır:
* `AuthRepository` arayüzü domain katmanında, `SupabaseAuthRepository` data katmanında yer alacaktır.
* `AuthStateNotifier` presentation katmanında ham Supabase client çağrılarını kaldırıp bu repoyu kullanacaktır.

---

## 11. State-Management Recommendation (Durum Yönetimi Önerisi)

- **Karar**: Repository/Use-case katmanı veri sınırlarında **`AppResult<T>`** (`AppSuccess`/`AppError`) kullanılacaktır. Presentation katmanında (Riverpod Notifier'lar) ise kullanıcı arayüzü iş durumlarını yansıtan özellik-odaklı durum modelleri (`AuthState` vb.) yönetilmeye devam edecektir. Arayüze ham hata türleri sızdırılmayacak, sadece failure üzerinden kullanıcı mesajları yansıtılacaktır.

---

## 12. Test Strategy (Test Stratejisi)

### Unit Tests Senaryoları (Bridge-B1):
1. `AppSuccess` durumunda fold metodunun doğru değeri döndüğünün testi.
2. `AppError` durumunda fold metodunun hata sarmalayıcısını doğru çalıştırdığının testi.
3. `map` ve `mapError` fonksiyonlarının işlevsel dönüşüm testleri.
4. `isSuccess` ve `isError` flag'lerinin doğru sonuç vermesi.

*Not: Postgres, Auth ve platform hatalarının testleri Bridge-B2'de `FailureMapper` yazıldığında eklenecektir.*

---

## 13. Incremental Implementation Phases (Uygulama Sıralaması)

### Phase 3C-Bridge-B1: AppFailure & AppResult Çekirdek Sözleşmeleri (Completed / Tamamlandı)
- **Kapsam**: `app_failure.dart` ve `app_result.dart` dosyalarının oluşturulması (Sadece saf Dart).
- **Dosyalar**:
  - [NEW] `apps/mobile/lib/core/errors/app_failure.dart`
  - [NEW] `apps/mobile/lib/core/result/app_result.dart`
- **Sınır**: Kesinlikle Supabase, Riverpod, Flutter UI veya platform importu barındırmaz. Sadece Dart unit testleri içerir.
- **Doğrulama**: `flutter test` (29/29 PASS) ve `flutter analyze` (Clean)
- **Rollback**: Yeni dosyaların silinmesi.

### Phase 3C-Bridge-B2: FailureMapper, Log ve Retry Kuralları

#### Phase 3C-Bridge-B2.1: Central Failure Mapper (Completed / Tamamlandı)
- **Kapsam**: `failure_mapper.dart` ve birim testlerinin oluşturulması.
- **Dosyalar**:
  - [NEW] `apps/mobile/lib/core/errors/failure_mapper.dart`
  - [NEW] `apps/mobile/test/core/failure_mapper_test.dart`
- **Doğrulama**: `flutter test test/core/failure_mapper_test.dart` (25/25 PASS) ve `flutter analyze` (Clean)

#### Phase 3C-Bridge-B2.2: Retry ve Timeout Kuralları (Completed / Tamamlandı)
- **Kapsam**: `operation_class.dart`, `retry_policy.dart` ve `timeout_policy.dart` sınıflarının, idempotent/non-idempotent kuralların yazılması ve testleri.
- **Dosyalar**:
  - [NEW] `apps/mobile/lib/core/async/operation_class.dart`
  - [NEW] `apps/mobile/lib/core/async/retry_policy.dart`
  - [NEW] `apps/mobile/lib/core/async/timeout_policy.dart`
  - [NEW] `apps/mobile/test/core/retry_and_timeout_policy_test.dart`
- **Doğrulama**: `flutter test test/core/retry_and_timeout_policy_test.dart` (38/38 PASS) ve `flutter analyze` (Clean)

#### Phase 3C-Bridge-B2.3: AppLogger ve Redaction (Completed / Tamamlandı)
- **Kapsam**: `AppLogger` soyutlama sözleşmesinin ve kişisel veri maskeleme mantığının kurulması.
- **Dosyalar**:
  - [NEW] [sensitive_data_redactor.dart](file:///c:/Projects/kampus-hub/apps/mobile/lib/core/logging/sensitive_data_redactor.dart)
  - [NEW] [app_logger.dart](file:///c:/Projects/kampus-hub/apps/mobile/lib/core/logging/app_logger.dart)
  - [NEW] [app_logger_and_redaction_test.dart](file:///c:/Projects/kampus-hub/apps/mobile/test/core/app_logger_and_redaction_test.dart)
- **Doğrulama**: `flutter test test/core/app_logger_and_redaction_test.dart` (52/52 PASS) ve `flutter analyze` (Clean).

### Phase 3C-Bridge-B3: Auth/Device Pilot Entegrasyonu (Completed / Tamamlandı)
- **Kapsam**: `AuthRepository` ve `DeviceSecurityRepository` arayüzleri tasarlandı, `SupabaseAuthRepository` ve `SupabaseDeviceSecurityRepository` implementasyonları veri katmanına alındı. `AuthStateNotifier` provider wiring ve repository entegrasyonu tamamlandı.
- **Doğrulama**: `flutter test` (12/12 repository unit testleri ve 161/161 tüm test paketi PASS) ve `flutter analyze` (Clean).

### Phase 3C-Bridge-B4: Dokümantasyon ve Kapanış (Completed / Tamamlandı)
- **Kapsam**: `project-state.json`, `CURRENT_STATE.md`, `TEST_STATUS.md` ve ilgili plan/yol haritası belgelerinin güncellenmesi.
- **Doğrulama**: Tüm Köprü-B mimari sınırları (domain, presentation, data), operation-aware retry kuralları, timeout'lar, failures ve logging test edilip doğrulandı. 161/161 Flutter testi, 60/60 pgTAP DB testi, git diff --check kontrolleri başarıyla tamamlandı. Mimari kapanış checklist'i onaylandı.

---

## 14. File-Impact Matrix (Dosya Etki Matrisi)

| Yeni Oluşturulacak Dosyalar (B1 & B2) | Düzenlenecek Mevcut Dosyalar (B3) | Taşınmayacak Dosyalar |
| :--- | :--- | :--- |
| `lib/core/errors/app_failure.dart` | `lib/features/auth/presentation/auth_state_notifier.dart` | `lib/core/router/app_router.dart` |
| `lib/core/result/app_result.dart` | `test/widget_and_router_test.dart` | Supabase migration dosyaları |
| `lib/core/errors/failure_mapper.dart`| `test/auth_test.dart` | |
| `lib/core/logging/app_logger.dart` | | |

---

## 15. Risks (Risk Analizi)
- **Import Kırılmaları**: Test mock sınıfları (`FakeAuthStateNotifier`) yeni arayüz yapısına geçirilirken derleme hatalarının oluşma riski.

---

## 16. Rollback Strategy (Geri Yükleme Stratejisi)
Herhangi bir hata durumunda:
```bash
git checkout -- apps/mobile/
```
komutu çalıştırılıp eklenen yeni dosyalar silinerek kararlı eski sürüme dönülecektir.

---

## 17. Acceptance Criteria (Kabul Kriterleri)
1. 11 adet `AppFailure` sınıfının ve `AppResult` (`AppSuccess` / `AppError`) modellerinin eksiksiz tanımlanması.
2. Bridge-B1 saf Dart unit testlerinin tamamının yeşil (PASS) olması.
3. Mevcut 20 Flutter testi ve analizinin temiz kalması.
