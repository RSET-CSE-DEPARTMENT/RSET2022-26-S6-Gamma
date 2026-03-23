import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:modernlogintute/pages/HomePage.dart';

import 'login_or_register_page.dart';
class AuthPage extends StatelessWidget {
  const AuthPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StreamBuilder <User?>(
        stream: FirebaseAuth.instance.authStateChanges(),
        builder: (context, snapshot){
          //The user is logged in 
          if(snapshot.hasData){
            return const HomePage();
          }
          else{
            return const LoginOrRegisterPage();
          }
          // The user is NOT logged in 
        },
      )
    );
  }
}