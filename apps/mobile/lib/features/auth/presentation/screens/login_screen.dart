import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kapindahub/core/result/app_result.dart';
import '../auth_state_notifier.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSignUp = false;

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final notifier = ref.read(authStateProvider.notifier);

    AppResult<void> result;
    if (_isSignUp) {
      result = await notifier.signUpWithEmail(email, password);
    } else {
      result = await notifier.signInWithEmail(email, password);
    }

    if (mounted && result is AppSuccess<void>) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_isSignUp ? 'Kayıt başarılı! Oturum açılıyor.' : 'Giriş başarılı!'),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final authNotifier = ref.read(authStateProvider.notifier);
    final isChecking = auth.status == AuthStatus.checkingAccess;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Brand Header Logo without white box background
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF6366F1).withAlpha(30),
                        ),
                        child: const Icon(
                          Icons.hub_rounded,
                          size: 72,
                          color: Color(0xFF6366F1),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Kapında Hub',
                      style: TextStyle(
                        color: Theme.of(context).textTheme.headlineMedium?.color,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Kampüs Kapında İç Operasyon Platformu',
                      style: TextStyle(
                        color: Theme.of(context).textTheme.bodyMedium?.color?.withAlpha(200),
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 32),

                    // Error alert if present
                    if (auth.error != null) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withAlpha(38),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFEF4444).withAlpha(77),
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline,
                              color: Color(0xFFEF4444),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                auth.error!,
                                style: const TextStyle(
                                  color: Color(0xFFFCA5A5),
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // Full Name Field (shown on Sign Up)
                    if (_isSignUp) ...[
                      TextFormField(
                        controller: _fullNameController,
                        decoration: InputDecoration(
                          labelText: 'İsim Soyisim',
                          prefixIcon: const Icon(Icons.person_outline),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'İsim Soyisim alanı boş bırakılamaz.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Email Input Field
                    TextFormField(
                      controller: _emailController,
                      decoration: InputDecoration(
                        labelText: 'E-posta Adresi',
                        prefixIcon: const Icon(Icons.email_outlined),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'E-posta alanı boş bırakılamaz.';
                        }
                        if (!value.contains('@')) {
                          return 'Geçerli bir e-posta adresi girin.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Password Input Field
                    TextFormField(
                      controller: _passwordController,
                      decoration: InputDecoration(
                        labelText: 'Şifre',
                        prefixIcon: const Icon(Icons.lock_outlined),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      obscureText: true,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Şifre alanı boş bırakılamaz.';
                        }
                        if (value.length < 6) {
                          return 'Şifre en az 6 karakter olmalıdır.';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),

                    // Primary Action Button (Login / Sign Up)
                    if (isChecking)
                      const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
                    else ...[
                      ElevatedButton(
                        onPressed: _submit,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          foregroundColor: Colors.white,
                          minimumSize: const Size(double.infinity, 56),
                          elevation: 2,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: Text(
                          _isSignUp ? 'Kayıt Ol ve Başla' : 'Giriş Yap',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Toggle Button between Sign In and Sign Up
                      TextButton(
                        onPressed: () {
                          setState(() {
                            _isSignUp = !_isSignUp;
                          });
                        },
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF94A3B8),
                        ),
                        child: Text(
                          _isSignUp
                              ? 'Zaten bir hesabınız var mı? Giriş Yapın'
                              : 'Hesabınız yok mu? Yeni Hesap Oluşturun',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),
                    const Row(
                      children: [
                        Expanded(child: Divider(color: Color(0xFF334155))),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16.0),
                          child: Text('veya', style: TextStyle(color: Color(0xFF64748B))),
                        ),
                        Expanded(child: Divider(color: Color(0xFF334155))),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Google OAuth Button
                    ElevatedButton(
                      onPressed: isChecking
                          ? null
                          : () => authNotifier.signInWithGoogle(simulate: kDebugMode),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF1F2937),
                        minimumSize: const Size(double.infinity, 56),
                        elevation: 1,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.g_mobiledata_rounded,
                            size: 32,
                            color: Color(0xFFEA4335),
                          ),
                          SizedBox(width: 8),
                          Text(
                            'Google ile Giriş Yap',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
