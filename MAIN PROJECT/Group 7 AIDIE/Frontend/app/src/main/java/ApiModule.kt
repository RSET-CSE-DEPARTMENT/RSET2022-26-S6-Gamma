package com.aidie.network

import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object ApiModule {

    // Replace with your real Cloud Functions base URL
    private const val BASE_URL = "https://your-region-yourproject.cloudfunctions.net/api/"

    val api: AidieApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
            .create(AidieApi::class.java)
    }
}
