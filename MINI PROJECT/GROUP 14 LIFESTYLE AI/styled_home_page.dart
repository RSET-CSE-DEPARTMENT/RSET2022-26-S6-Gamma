import 'package:flutter/material.dart';
import 'home_page.dart';

class StyledHomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Stretched Welcome Banner
          Container(
            width: double.infinity,
            height: 280, // Increased height
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.black, Color(0xFF7B4F3D)], // Dark brown gradient
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(50),
                bottomRight: Radius.circular(50),
              ),
            ),
            child: const Center(
              child: Text(
                "Welcome!",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 34, // Slightly larger text
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),

          const SizedBox(height: 80), // Pushed content lower

          // Description text
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32.0),
            child: const Text(
              "Your smart wardrobe assistant is here to simplify your style. Get AI-powered outfit suggestions, weather-based tips, and personalized fashion advice — all while making the most of your wardrobe.\n\n"
                  "Ready to dress smarter?",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, color: Colors.black87, height: 1.5),
            ),
          ),

          const SizedBox(height: 60), // Pushed button lower

          // Get Started Button
          SizedBox(
            width: 180,
            height: 50,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Color(0xFF5D2C1D), // Dark brown button
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                // Navigate to HomePage
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (context) => HomePage()),
                );
              },
              child: const Text(
                "Get Started",
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}