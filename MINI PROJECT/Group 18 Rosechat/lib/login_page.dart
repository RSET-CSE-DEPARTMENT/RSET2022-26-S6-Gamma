import 'package:flutter/material.dart';
import 'package:democalls/services/login_service.dart';
import 'package:democalls/utils/utils.dart';
import 'package:democalls/constants/constants.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'register_page.dart'; // You'll need to create this similar to the sample
import 'package:http/http.dart' as http;
import 'dart:convert';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<StatefulWidget> createState() => LoginPageState();
}

class LoginPageState extends State<LoginPage> {
  final TextEditingController _userIDTextCtrl = TextEditingController(text: '');
  final TextEditingController _passwordController = TextEditingController();
  final ValueNotifier<bool> _passwordVisible = ValueNotifier<bool>(false);
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    getUniqueUserId().then((userID) {
      if (mounted) {
        setState(() {
          _userIDTextCtrl.text = userID;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.deepPurple, Colors.pinkAccent],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: SingleChildScrollView(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(FontAwesomeIcons.user,
                      size: 80, color: Colors.white),
                  const SizedBox(height: 20),
                  const Text(
                    'Welcome Back',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 30),
                  _buildPhoneNumberField(),
                  const SizedBox(height: 15),
                  _buildPasswordField(),
                  const SizedBox(height: 25),
                  _buildLoginButton(),
                  const SizedBox(height: 15),
                  if (_isLoading)
                    const CircularProgressIndicator(color: Colors.white),
                  const SizedBox(height: 20),
                  _buildRegisterButton(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPhoneNumberField() {
    return TextField(
      controller: _userIDTextCtrl,
      keyboardType: TextInputType.phone,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withOpacity(0.2),
        hintText: 'Phone Number',
        prefixIcon: const Icon(FontAwesomeIcons.phone, color: Colors.white),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10.0),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(vertical: 15),
      ),
    );
  }

  Widget _buildPasswordField() {
    return ValueListenableBuilder<bool>(
      valueListenable: _passwordVisible,
      builder: (context, isPasswordVisible, _) {
        return TextField(
          controller: _passwordController,
          obscureText: !isPasswordVisible,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.white.withOpacity(0.2),
            hintText: 'Password',
            prefixIcon: const Icon(FontAwesomeIcons.lock, color: Colors.white),
            suffixIcon: IconButton(
              icon: Icon(
                isPasswordVisible ? Icons.visibility : Icons.visibility_off,
                color: Colors.white,
              ),
              onPressed: () {
                _passwordVisible.value = !_passwordVisible.value;
              },
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10.0),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(vertical: 15),
          ),
        );
      },
    );
  }

  Widget _buildLoginButton() {
    return ElevatedButton(
      onPressed:
          (_isLoading || _userIDTextCtrl.text.isEmpty) ? null : _handleLogin,
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.pinkAccent,
        padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 15),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),
      child: const Text(
        'LOG IN',
        style: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildRegisterButton() {
    return TextButton(
      onPressed: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const RegisterPage()),
        );
      },
      child: const Text(
        "Don't have an account? Register",
        style: TextStyle(
          color: Colors.white,
          fontSize: 16,
          decoration: TextDecoration.underline,
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    setState(() => _isLoading = true);
    try {
      // First check with the server
      final response = await http.post(
        Uri.parse(
            'http://192.168.230.124:5000/login'), // Replace with your actual server IP
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': _userIDTextCtrl.text,
          'password': _passwordController.text,
        }),
      );

      if (response.statusCode == 200) {
        // Server login successful, proceed with your existing login
        await login(
          userId: _userIDTextCtrl.text,
          userName: 'user_${_userIDTextCtrl.text}',
        );
        if (mounted) {
          Navigator.pushNamed(
            context,
            PageRouteName.home,
          );
        }
      } else {
        final errorData = jsonDecode(response.body);
        throw Exception(errorData['error'] ?? 'Login failed');
      }
    } catch (e) {
      debugPrint('Login Error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
