val kotlin_version: String by project
val logback_version: String by project

plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.ktor)
    alias(libs.plugins.ktlint)
    alias(libs.plugins.flyway)
}

group = "no.nav"
version = "0.0.1"

application {
    mainClass = "io.ktor.server.netty.EngineMain"
}

kotlin {
    jvmToolchain(21)
}

buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath(libs.database.flyway.core)
    }
}

dependencies {
    implementation(libs.datafaker)
    implementation(libs.logback.classic)
    implementation(libs.bundles.ktor.client)
    implementation(libs.bundles.ktor.server)
    implementation(libs.koin.ktor)
    implementation(libs.koin.logger)
    implementation(libs.logstash)
    implementation(libs.jackson.datatype.jsr310)
    implementation(libs.bundles.database)
    implementation(libs.ktor.server.micrometer)
    implementation(libs.micrometer.prometheus)
    implementation(libs.kafka.clients)
    implementation(libs.valkey.java)
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")
}
