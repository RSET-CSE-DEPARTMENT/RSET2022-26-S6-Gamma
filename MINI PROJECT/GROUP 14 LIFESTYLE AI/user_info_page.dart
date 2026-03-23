import 'package:flutter/material.dart';
import 'styled_home_page.dart';

class UserInfoPage extends StatefulWidget {
  @override
  _UserInfoPageState createState() => _UserInfoPageState();
}

class _UserInfoPageState extends State<UserInfoPage> {
  TextEditingController heightController = TextEditingController();
  String selectedGender = "Male";
  String? selectedBodyShape;
  String? selectedSkinTone;

  final List<String> bodyShapes = ["Inverted Triangle", "Triangle", "Oval", "Rectangle", "Hourglass"];

  final List<Color> skinTones = [
    Color(0xFFFBEFE5), Color(0xFFF8D7B8), Color(0xFFF1C096), Color(0xFFE3A778), Color(0xFFD19471), Color(0xFFC1805E),
    Color(0xFFB0704F), Color(0xFF8C5A38), Color(0xFF6D462A), Color(0xFF5D3D26), Color(0xFF3D2718), Color(0xFF2E1F14),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [Colors.black, Colors.brown], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.only(bottomLeft: Radius.circular(40), bottomRight: Radius.circular(40)),
              ),
              child: const Text("More about you", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white), textAlign: TextAlign.center),
            ),
            const SizedBox(height: 20),

            // Height Input
            TextField(
              controller: heightController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: "Height (in cm)",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              ),
            ),
            const SizedBox(height: 20),

            // Gender Selection
            const Text("Gender", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Row(
              children: [
                Radio(value: "Male", groupValue: selectedGender, onChanged: (value) => setState(() => selectedGender = value.toString())),
                const Text("Male"),
                Radio(value: "Female", groupValue: selectedGender, onChanged: (value) => setState(() => selectedGender = value.toString())),
                const Text("Female"),
              ],
            ),
            const SizedBox(height: 20),

            // Body Shape Selection with Gender-based Image
            const Text("Body Shape", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),

            Image.asset(
              selectedGender == "Male"
                  ? 'assets/images/male_body_shapes.png'   // 👈 Male body shapes image
                  : 'assets/images/female_body_shapes.png', // 👈 Female body shapes image
              width: double.infinity,
              height: 200,
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return Column(
                  children: [
                    Icon(Icons.error, color: Colors.red, size: 50),
                    Text("Image not found", style: TextStyle(color: Colors.red)),
                  ],
                );
              },
            ),
            const SizedBox(height: 10),

            DropdownButtonFormField<String>(
              value: selectedBodyShape,
              hint: const Text("Select"),
              items: bodyShapes.map((shape) => DropdownMenuItem(value: shape, child: Text(shape))).toList(),
              onChanged: (value) => setState(() => selectedBodyShape = value),
              decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14)),
            ),
            const SizedBox(height: 20),

            // Skin Tone Selection
            const Text("Skin Tone", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),

            Column(
              children: [
                // First Row (6 skin tones)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(6, (index) => skinToneCircle(skinTones[index])),
                ),
                const SizedBox(height: 12),

                // Second Row (6 skin tones)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(6, (index) => skinToneCircle(skinTones[index + 6])),
                ),
              ],
            ),
            const SizedBox(height: 25),

            // Submit Button - Now Goes to StyledHomePage
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.brown, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                onPressed: () {
                  if (heightController.text.isEmpty || selectedBodyShape == null || selectedSkinTone == null) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please fill all details")));
                    return;
                  }

                  // Navigate to StyledHomePage
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (context) => StyledHomePage()),
                  );
                },
                child: const Text("Submit", style: TextStyle(fontSize: 16, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Function to create skin tone selection circles
  Widget skinToneCircle(Color color) {
    return GestureDetector(
      onTap: () => setState(() => selectedSkinTone = color.toString()),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(color: selectedSkinTone == color.toString() ? Colors.black : Colors.transparent, width: 2),
        ),
      ),
    );
  }
}