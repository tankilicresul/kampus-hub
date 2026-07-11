import '../errors/app_failure.dart';

sealed class AppResult<T> {
  const AppResult();

  bool get isSuccess => this is AppSuccess<T>;
  bool get isError => this is AppError<T>;

  T? get valueOrNull => fold(
        onSuccess: (val) => val,
        onError: (_) => null,
      );

  AppFailure? get failureOrNull => fold(
        onSuccess: (_) => null,
        onError: (fail) => fail,
      );

  AppResult<R> map<R>(R Function(T value) transform) {
    return fold(
      onSuccess: (val) => AppSuccess<R>(transform(val)),
      onError: (fail) => AppError<R>(fail),
    );
  }

  AppResult<T> mapError(AppFailure Function(AppFailure failure) transform) {
    return fold(
      onSuccess: (val) => AppSuccess<T>(val),
      onError: (fail) => AppError<T>(transform(fail)),
    );
  }

  R fold<R>({
    required R Function(T value) onSuccess,
    required R Function(AppFailure failure) onError,
  });

  R when<R>({
    required R Function(T value) success,
    required R Function(AppFailure failure) error,
  }) {
    return fold(
      onSuccess: success,
      onError: error,
    );
  }
}

final class AppSuccess<T> extends AppResult<T> {
  final T value;

  const AppSuccess(this.value);

  @override
  R fold<R>({
    required R Function(T value) onSuccess,
    required R Function(AppFailure failure) onError,
  }) {
    return onSuccess(value);
  }
}

final class AppError<T> extends AppResult<T> {
  final AppFailure failure;

  const AppError(this.failure);

  @override
  R fold<R>({
    required R Function(T value) onSuccess,
    required R Function(AppFailure failure) onError,
  }) {
    return onError(failure);
  }
}
