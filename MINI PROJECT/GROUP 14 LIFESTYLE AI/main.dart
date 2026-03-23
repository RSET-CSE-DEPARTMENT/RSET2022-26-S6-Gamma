import 'package:flutter/material.dart';
import 'user_info_page.dart';
import 'hanger_page.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'LifeStyle AI',
      theme: ThemeData(
        primaryColor: Colors.brown.shade800,
      ),
      home: const SplashScreen(),
    );
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pushReplacement(
          context, MaterialPageRoute(builder: (context) => const LoginScreen()));
    });

    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Image.asset(
          'assets/logo.png',
          width: 250,
          height: 250,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isPasswordVisible = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Login",
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 5),
                    const Text("Sign in to continue"),
                    const SizedBox(height: 20),
                    _buildTextField("Enter your username"),
                    const SizedBox(height: 12),
                    _buildTextField("Password", isPassword: true, isPasswordVisible: _isPasswordVisible, onToggle: () {
                      setState(() {
                        _isPasswordVisible = !_isPasswordVisible;
                      });
                    }),
                    const SizedBox(height: 20),
                    _buildButton(context, "Sign in"),
                  ],
                ),
              ),
            ),
            _buildBottomText(context, "Don't have an account?", "Sign up", const SignupScreen()),
          ],
        ),
      ),
    );
  }
}

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  bool agreeToTerms = false;
  bool _isPasswordVisible = false;
  bool _isConfirmPasswordVisible = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Create Account",
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 5),
              const Text("Sign up to continue"),
              const SizedBox(height: 20),
              _buildTextField("Enter your username"),
              const SizedBox(height: 12),
              _buildTextField("Password", isPassword: true, isPasswordVisible: _isPasswordVisible, onToggle: () {
                setState(() {
                  _isPasswordVisible = !_isPasswordVisible;
                });
              }),
              const SizedBox(height: 12),
              _buildTextField("Confirm Password", isPassword: true, isPasswordVisible: _isConfirmPasswordVisible, onToggle: () {
                setState(() {
                  _isConfirmPasswordVisible = !_isConfirmPasswordVisible;
                });
              }),
              const SizedBox(height: 12),
              Row(
                children: [
                  Checkbox(
                    value: agreeToTerms,
                    onChanged: (value) {
                      setState(() {
                        agreeToTerms = value ?? false;
                      });
                    },
                  ),
                  const Text("I agree to all the "),
                  TextButton(
                    onPressed: () {},
                    child: const Text("Terms and Privacy policy", style: TextStyle(color: Colors.blue)),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.brown.shade800,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (context) => UserInfoPage()),
                    );
                  },
                  child: const Text("Sign Up", style: TextStyle(fontSize: 16, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Widget _buildTextField(String hint, {bool isPassword = false, bool isPasswordVisible = false, VoidCallback? onToggle}) {
  return TextField(
    obscureText: isPassword && !isPasswordVisible,
    decoration: InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(color: Colors.black54),
      filled: true,
      fillColor: Colors.white,
      enabledBorder: OutlineInputBorder(
        borderSide: BorderSide(color: Colors.black, width: 1.5),
        borderRadius: BorderRadius.circular(8),
      ),
      focusedBorder: OutlineInputBorder(
        borderSide: BorderSide(color: Colors.brown.shade800, width: 2),
        borderRadius: BorderRadius.circular(8),
      ),
      suffixIcon: isPassword
          ? IconButton(
        icon: Icon(isPasswordVisible ? Icons.visibility : Icons.visibility_off, color: Colors.black54),
        onPressed: onToggle,
      )
          : null,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
    ),
    style: TextStyle(color: Colors.black),
  );
}

Widget _buildButton(BuildContext context, String text) {
  return SizedBox(
    width: double.infinity,
    height: 50,
    child: ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.brown.shade800,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      onPressed: () {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => HangerPage()), // Ensure HangerPage is correctly imported
        );
      },
      child: Text(text, style: const TextStyle(fontSize: 16, color: Colors.white)),
    ),
  );
}


Widget _buildBottomText(BuildContext context, String text, String linkText, Widget screen) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 20.0),
    child: Center(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(text),
          TextButton(
            onPressed: () {
              Navigator.push(context, MaterialPageRoute(builder: (context) => screen));
            },
            child: Text(linkText),
          ),
        ],
      ),
    ),
  );
}