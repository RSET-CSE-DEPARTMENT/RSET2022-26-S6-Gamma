import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';
import 'package:modernlogintute/services/location_service.dart';

class FirestoreLocationUpdater extends StatefulWidget {
  final String userId;

  const FirestoreLocationUpdater({super.key, required this.userId});

  @override
  _FirestoreLocationUpdaterState createState() =>
      _FirestoreLocationUpdaterState();
}

class _FirestoreLocationUpdaterState extends State<FirestoreLocationUpdater> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final LocationService _locationService = LocationService();

  Future<void> _updateFirestoreLocation() async {
    try {
      Position? position = await _locationService.getCurrentLocation();
      if (position != null) {
        await _firestore.collection("bus_locations").doc(widget.userId).set({
          'latitude': position.latitude,
          'longitude': position.longitude,
          'timestamp': FieldValue.serverTimestamp(),
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Location updated successfully!")),
        );
      }
    } catch (e) {
      debugPrint("Error updating Firestore: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: $e")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Update Firestore Location")),
      body: Center(
        child: ElevatedButton(
          onPressed: _updateFirestoreLocation,
          child: const Text("Update Location"),
        ),
      ),
    );
  }
}

/*import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:modernlogintute/services/location_service.dart';

class FirestoreLocationUpdater extends StatefulWidget {
  final String userId;

  const FirestoreLocationUpdater({super.key, required this.userId});

  @override
  _FirestoreLocationUpdaterState createState() =>
      _FirestoreLocationUpdaterState();
}

class _FirestoreLocationUpdaterState extends State<FirestoreLocationUpdater> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final LocationService _locationService = LocationService();

  Future<void> _updateLocation() async {
    try {
      // Request location permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
          throw Exception("Location permission denied");
        }
      }

      // Get current location
      Position? position = await _locationService.getCurrentLocation();
      if (position == null) {
        throw Exception("Failed to retrieve location.");
      }

      // Update Firestore
      await _firestore.collection("bus_locations").doc(widget.userId).set({
        'latitude': position.latitude,
        'longitude': position.longitude,
        'timestamp': FieldValue.serverTimestamp(),
      });

      // Update Firebase Realtime Database
      _locationService.updateLocation(position, widget.userId);

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Location updated successfully!")),
      );
    } catch (e) {
      debugPrint("Error updating location: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Error: $e")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Update Location")),
      body: Center(
        child: ElevatedButton(
          onPressed: _updateLocation,
          child: const Text("Update Location"),
        ),
      ),
    );
  }
}

*/