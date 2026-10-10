pluginManagement {
    repositories {
        gradlePluginPortal()
        maven {
            url = uri("https://nexus.inductiveautomation.com/repository/public")
        }
    }
}

rootProject.name = "ignition-perspective-screensaver-module"

dependencyResolutionManagement {
    repositories {
        maven {
            url = uri("https://nexus.inductiveautomation.com/repository/public")
        }
        mavenCentral()
    }
}

include(
    ":common",
    ":gateway",
    ":designer",
    ":web"
)
