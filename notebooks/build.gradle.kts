plugins {
    alias(libs.plugins.kotlin.jvm)
}

group = "no.nav"
version = "0.0.1"

kotlin {
    jvmToolchain(21)
}

dependencies {
    implementation(libs.kotlinx.coroutines.core)
    implementation(libs.logback.classic)
}
