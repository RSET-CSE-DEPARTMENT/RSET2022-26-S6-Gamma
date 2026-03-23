package com.aidie.network

import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST


data class CreateChildRequest(
    val name: String,
    val age: Int?,
    val avatarUrl: String?
)

data class ChildResponse(
    val id: String,
    val data: Map<String, Any?>
)

data class CompleteTaskRequest(
    val childId: String,
    val assignmentId: String,
    val result: ResultPayload
)

data class ResultPayload(
    val score: Int,
    val points: Int
)

data class CompleteTaskResponse(
    val success: Boolean
)

interface AidieApi {

    // POST /api/children
    @POST("api/children")
    suspend fun createChild(
        @Header("Authorization") authHeader: String,
        @Body body: CreateChildRequest
    ): ChildResponse

    // POST /api/completeTask
    @POST("api/completeTask")
    suspend fun completeTask(
        @Body body: CompleteTaskRequest
    ): CompleteTaskResponse
}
