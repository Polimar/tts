package it.polimar.tts.client.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class HealthResponse(
    val status: String,
    @SerialName("worker_ready")
    val workerReady: Boolean,
)

@Serializable
data class DeviceInfo(
    val device: String,
    @SerialName("model_id")
    val modelId: String,
    @SerialName("xpu_gate_passed")
    val xpuGatePassed: Boolean,
    @SerialName("xpu_gate_reason")
    val xpuGateReason: String,
    @SerialName("xpu_memory_bytes")
    val xpuMemoryBytes: Long,
    @SerialName("cpu_warmup_seconds")
    val cpuWarmupSeconds: Float,
    @SerialName("xpu_warmup_seconds")
    val xpuWarmupSeconds: Float? = null,
)
