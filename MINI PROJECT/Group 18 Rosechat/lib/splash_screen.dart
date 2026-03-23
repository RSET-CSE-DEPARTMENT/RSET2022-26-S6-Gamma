import 'package:flutter/material.dart';
import 'package:democalls/constants/constants.dart';
import 'package:google_fonts/google_fonts.dart'; // For beautiful font styles
import 'package:flutter_spinkit/flutter_spinkit.dart'; // For animated loading effect

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  @override
  void initState() {
    super.initState();
    _navigateToNextScreen();
  }

  void _navigateToNextScreen() {
    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pushReplacementNamed(
        context,
        Constants.currentUser.id.isEmpty 
            ? PageRouteName.login 
            : PageRouteName.home,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.blueAccent.shade700, // Background color
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Calling Icon
            Icon(
              Icons.call, 
              size: 100, 
              color: Colors.white, 
            ),

            const SizedBox(height: 20), // Spacing

            // App Name "Rose Call"
            Text(
              "Rose Call",
              style: GoogleFonts.poppins(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),

            const SizedBox(height: 30), // Spacing

            // Animated Loader
            SpinKitWave(color: Colors.white, size: 40),
          ],
        ),
      ),
    );
  }
}
