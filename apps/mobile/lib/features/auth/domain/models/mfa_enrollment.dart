/// MFA TOTP enrollment result returned after calling enrollMfaTotp().
///
/// Contains the QR code URI (for QR display) and the raw secret
/// (for manual entry), plus the factor ID needed for the verify step.
class MfaEnrollment {
  final String factorId;
  final String qrCodeUri;
  final String secret;

  const MfaEnrollment({
    required this.factorId,
    required this.qrCodeUri,
    required this.secret,
  });
}
