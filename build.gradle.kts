/*
 * Mustry Screensaver — an Ignition 8.3 Perspective module for screens nobody is
 * touching: browser-side idle detection, alarm-aware idle modes and burn-in
 * care. Structure mirrors Mustry Doom (Gradle + the Ignition modl plugin, a
 * webpack web subproject bundled into the gateway scope).
 */

plugins {
    id("io.ia.sdk.modl") version("0.5.0")
}

val sdk_version by extra("8.3.6")

allprojects {
    version = (project.findProperty("releaseVersion") as String?)?.removePrefix("v") ?: "0.1.0-SNAPSHOT"
    // Sources are UTF-8 whatever the build machine's locale says.
    tasks.withType<JavaCompile>().configureEach { options.encoding = "UTF-8" }
    tasks.withType<Javadoc>().configureEach { options.encoding = "UTF-8" }
}

ignitionModule {
    name.set("Mustry Screensaver")
    fileName.set("Mustry-Screensaver")
    id.set("com.mustrysolutions.screensaver")

    // Ignition's module version parser accepts only numeric x.y.z(.b).
    moduleVersion.set(project.provider {
        val v = project.version.toString()
        val base = v.substringBefore("-")
        val preNumber = Regex("[0-9]+$").find(v.substringAfter("-", ""))?.value
        if (v.contains("-") && preNumber != null) "$base.$preNumber" else base
    })

    moduleDescription.set("Idle detection for Perspective: after a timeout the page shows a clock, a starfield or pipes coloured by your tags, and wakes on any touch or on an alarm. Never hides an active critical alarm. Burn-in drift and night dimming for 24/7 screens. Free. By Mustry Solutions (mustrysolutions.com).")

    requiredIgnitionVersion.set(sdk_version)

    projectScopes.putAll(mapOf(
        ":common" to "GD",
        ":designer" to "D",
        ":gateway" to "G"
    ))

    moduleDependencies.set(mapOf<String, String>())

    moduleDependencySpecs {
        register("com.inductiveautomation.perspective") {
            scope = "GD"
            required = true
        }
    }

    hooks.putAll(mapOf(
        "com.mustrysolutions.screensaver.gateway.ScreensaverGatewayHook" to "G",
        "com.mustrysolutions.screensaver.designer.ScreensaverDesignerHook" to "D"
    ))

    freeModule.set(true)
    license.set("license.html")

    // Sign only when signing credentials are supplied via -Pignition.signing.*
    skipModlSigning.set(!project.hasProperty("ignition.signing.keystoreFile"))
}

// assembleModlStructure is additive: wipe the staging folder so stale jars
// from an earlier build never ride along in the .modl.
tasks.named("assembleModlStructure") {
    doFirst {
        delete(layout.buildDirectory.dir("moduleContent"))
    }
}
