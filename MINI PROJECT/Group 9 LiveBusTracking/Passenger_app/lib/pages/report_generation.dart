import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: ReportIncidentPage(),
  ));
}

class ReportIncidentPage extends StatefulWidget {
  const ReportIncidentPage({super.key});

  @override
  _ReportIncidentPageState createState() => _ReportIncidentPageState();
}

class _ReportIncidentPageState extends State<ReportIncidentPage> {
  final TextEditingController nameController = TextEditingController();
  final TextEditingController incidentController = TextEditingController();
  final FirebaseFirestore firestore = FirebaseFirestore.instance;

  Future<void> submitIncident() async {
    String name = nameController.text.trim();
    String incident = incidentController.text.trim();

    if (name.isNotEmpty && incident.isNotEmpty) {
      await firestore.collection("Report_User").add({
        "name": name,
        "incident": incident,
        "timestamp": FieldValue.serverTimestamp(),
      });

      // Show confirmation message
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Incident Submitted Successfully!")),
      );

      // Clear text fields after submission
      nameController.clear();
      incidentController.clear();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please fill all fields!")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
      flexibleSpace: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [
                  Colors.blue,
                  Colors.deepPurple,
                  Colors.orangeAccent,
                ],
              ),
            boxShadow: [
              BoxShadow(
                color: Colors.black,
                spreadRadius: 5,
                blurRadius: 6,
                offset: Offset(0,-4) )
            ]
        ),
      ),
      
      toolbarHeight: 60,
      title: const Text('Report Incident'),
      centerTitle: true,
      titleTextStyle: const TextStyle(
        fontWeight: FontWeight.bold,
        fontSize: 24
      ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Please report the incident",
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 30),
            const Text("Enter your name"),
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: "Your Name",
              ),
            ),
            const SizedBox(height: 20),
            const Text("Report the incident"),
            TextField(
              controller: incidentController,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                hintText: "Describe the incident...",
              ),
              maxLines: 5,
            ),
            const SizedBox(height: 30),
            Center(
              child: ElevatedButton(
                onPressed: submitIncident,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 15),
                  textStyle: const TextStyle(fontSize: 16),
                ),
                child: const Text("Submit"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
