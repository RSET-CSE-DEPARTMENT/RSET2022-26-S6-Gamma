// auth_screens/allergy_preferences_screen.dart
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../screens/video_search_screen.dart';

class AllergyPreferencesScreen extends StatefulWidget {
  @override
  _AllergyPreferencesScreenState createState() => _AllergyPreferencesScreenState();
}

class _AllergyPreferencesScreenState extends State<AllergyPreferencesScreen> {
  bool _isLoading = false;
  final Map<String, bool> _allergyOptions = {
    'Dairy': false,
    'Eggs': false,
    'Fish': false,
    'Shellfish': false,
    'Tree nuts': false,
    'Peanuts': false,
    'Wheat': false,
    'Soy': false,
    'Gluten': false,
    'Sesame': false,
  };

  Future<void> _savePreferences() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final userId = FirebaseAuth.instance.currentUser?.uid;
      if (userId != null) {
        // Get selected allergies
        final selectedAllergies = _allergyOptions.entries
            .where((entry) => entry.value)
            .map((entry) => entry.key)
            .toList();

        // Save to Firestore
        await FirebaseFirestore.instance.collection('users').doc(userId).update({
          'allergies': selectedAllergies,
          'allergyPreferencesSet': true,
        });

        // Navigate to main screen
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => VideoSearchScreen()),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error saving preferences: $e')),
      );
    }

    setState(() {
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Allergy Preferences'),
        backgroundColor: Colors.red,
        elevation: 0,
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.red.shade100, Colors.white],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Do you have any food allergies?',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  'Select all that apply to help us filter recipes for you.',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey[700],
                  ),
                ),
                SizedBox(height: 24),
                Expanded(
                  child: ListView(
                    children: _allergyOptions.keys.map((String key) {
                      return Card(
                        elevation: 2,
                        margin: EdgeInsets.symmetric(vertical: 6),
                        child: CheckboxListTile(
                          title: Text(key),
                          value: _allergyOptions[key],
                          activeColor: Colors.red,
                          onChanged: (bool? value) {
                            setState(() {
                              _allergyOptions[key] = value ?? false;
                            });
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
                SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _isLoading ? null : _savePreferences,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(vertical: 12),
                    minimumSize: Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isLoading
                      ? CircularProgressIndicator(color: Colors.white)
                      : Text('Save Preferences', style: TextStyle(fontSize: 16)),
                ),
                SizedBox(height: 12),
                TextButton(
                  onPressed: _isLoading
                      ? null
                      : () {
                          Navigator.of(context).pushReplacement(
                            MaterialPageRoute(builder: (context) => VideoSearchScreen()),
                          );
                        },
                  style: TextButton.styleFrom(
                    minimumSize: Size(double.infinity, 40),
                  ),
                  child: Text('Skip for now'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}