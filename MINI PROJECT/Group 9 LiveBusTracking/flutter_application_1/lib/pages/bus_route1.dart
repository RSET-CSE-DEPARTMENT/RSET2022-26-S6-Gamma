import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:location/location.dart';
import 'package:dio/dio.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class busRoute1 extends StatefulWidget {
  const busRoute1({super.key});

  @override
  State<busRoute1> createState() => _BusRouteState();
}

class _BusRouteState extends State<busRoute1> {
  final Location _locationController = Location();
  final Completer<GoogleMapController> _mapController = Completer();
  StreamSubscription<LocationData>? _locationSubscription;

  static const LatLng _pGoogleSrc = LatLng(10.527642, 76.214435);
  static const LatLng _pGoogleDest = LatLng(9.931233, 76.267304);
  LatLng? _currentP;

  final Set<Polyline> _polylines = {};
  String googleAPIKey = "AIzaSyCrQPGCT2DyBZFJWX_xrn-28jRz6RgdWVA";
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  @override
  void initState() {
    super.initState();
    getLocationUpdates();
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.blue, Colors.deepPurple, Colors.orangeAccent],
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black,
                spreadRadius: 5,
                blurRadius: 6,
                offset: Offset(0, -4),
              )
            ],
          ),
        ),
        toolbarHeight: 60,
        title: const Text('Route 1'),
        centerTitle: true,
        titleTextStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 24),
      ),
      body: _currentP == null
          ? const Center(child: Text("Loading..."))
          : GoogleMap(
              onMapCreated: (GoogleMapController controller) => _mapController.complete(controller),
              initialCameraPosition: const CameraPosition(target: _pGoogleSrc, zoom: 13),
              markers: {
                Marker(markerId: const MarkerId("_currentlocation"), icon: BitmapDescriptor.defaultMarker, position: _currentP!),
                const Marker(markerId: MarkerId("_sourcelocation"), icon: BitmapDescriptor.defaultMarker, position: _pGoogleSrc),
                const Marker(markerId: MarkerId("_destinationlocation"), icon: BitmapDescriptor.defaultMarker, position: _pGoogleDest),
              },
              polylines: _polylines,
            ),
    );
  }

  Future<void> _cameraToPosition(LatLng pos) async {
    final GoogleMapController controller = await _mapController.future;
    await controller.animateCamera(CameraUpdate.newCameraPosition(CameraPosition(target: pos, zoom: 10)));
  }

  void getLocationUpdates() async {
    bool serviceEnabled = await _locationController.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await _locationController.requestService();
      if (!serviceEnabled) return;
    }

    PermissionStatus permissionGranted = await _locationController.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await _locationController.requestPermission();
      if (permissionGranted != PermissionStatus.granted) return;
    }

    _locationSubscription = _locationController.onLocationChanged.listen((LocationData currentLocation) {
      if (currentLocation.latitude != null && currentLocation.longitude != null) {
        if (mounted) {
          setState(() {
            _currentP = LatLng(currentLocation.latitude!, currentLocation.longitude!);
            _cameraToPosition(_currentP!);
            _updateFirestoreLocation(_currentP!);
            _getDirections(_currentP!, _pGoogleDest);
          });
        }
      }
    });
  }

  Future<void> _updateFirestoreLocation(LatLng position) async {
    await _firestore.collection('bus_locations').doc('bus_1').set({
      'latitude': position.latitude,
      'longitude': position.longitude,
      'timestamp': FieldValue.serverTimestamp(),
    });
  }

  Future<void> _getDirections(LatLng start, LatLng end) async {
  final String url =
      "https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&key=$googleAPIKey";

  try {
    final response = await Dio().get(url);
    if (response.statusCode == 200) {
      final data = response.data;
      final List<LatLng> polylineCoordinates = [];

      // Extract the encoded polyline from the response
      String encodedPolyline = data['routes'][0]['overview_polyline']['points'];

      // Decode and add polyline points
      polylineCoordinates.addAll(decodePolyline(encodedPolyline));

      setState(() {
        _polylines.clear();
        _polylines.add(
          Polyline(
            polylineId: const PolylineId("realTimeRoute"),
            color: Colors.blue,
            width: 5,
            points: polylineCoordinates,
          ),
        );
      });
    }
  } catch (e) {
    print("Error fetching directions: $e");
  }
}

// Function to decode Google's encoded polyline
List<LatLng> decodePolyline(String encoded) {
  List<LatLng> polyline = [];
  int index = 0, len = encoded.length;
  int lat = 0, lng = 0;

  while (index < len) {
    int shift = 0, result = 0;
    int b;
    do {
      b = encoded.codeUnitAt(index++) - 63;
      result |= (b & 0x1F) << shift;
      shift += 5;
    } while (b >= 0x20);
    int dlat = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.codeUnitAt(index++) - 63;
      result |= (b & 0x1F) << shift;
      shift += 5;
    } while (b >= 0x20);
    int dlng = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    polyline.add(LatLng(lat / 1E5, lng / 1E5));
  }

  return polyline;
}

}
