package com.mustrysolutions.screensaver.common;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.util.List;
import java.util.Set;

import javax.swing.ImageIcon;

import com.inductiveautomation.ignition.common.jsonschema.JsonSchema;
import com.inductiveautomation.perspective.common.api.BrowserResource;
import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentDescriptorImpl;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;

/**
 * Module-wide constants shared across the gateway, designer and common scopes.
 */
public final class MustryScreensaverModule {

    private MustryScreensaverModule() {
    }

    /** Module id — must match {@code id} in the root build.gradle.kts. */
    public static final String MODULE_ID = "com.mustrysolutions.screensaver";

    /** Mount alias: the module's web resources are served at {@code /res/<URL_ALIAS>/}. */
    public static final String URL_ALIAS = "mustry-screensaver";

    /** Palette category the components appear under in the Designer. */
    public static final String COMPONENT_CATEGORY = "Mustry Solutions";

    /** The JS/CSS bundle Perspective loads for this module's components. */
    public static final Set<BrowserResource> BROWSER_RESOURCES = Set.of(
        new BrowserResource(
            "mustry-screensaver-js",
            String.format("/res/%s/MustryScreensaver.js", URL_ALIAS),
            BrowserResource.ResourceType.JS
        ),
        new BrowserResource(
            "mustry-screensaver-css",
            String.format("/res/%s/MustryScreensaver.css", URL_ALIAS),
            BrowserResource.ResourceType.CSS
        )
    );

    public static JsonSchema schema(String resourcePath) {
        return JsonSchema.parse(MustryScreensaverModule.class.getResourceAsStream(resourcePath));
    }

    public static ComponentEventDescriptor event(String name, String description, String schemaResource) {
        return new ComponentEventDescriptor(name, description, schema(schemaResource));
    }

    public static ComponentDescriptor descriptor(String id, String name, String metaName,
            String paletteDescription, String schemaResource, List<ComponentEventDescriptor> events) {
        BufferedImage icon = paletteIcon();
        ComponentDescriptorImpl.ComponentBuilder builder = ComponentDescriptorImpl.ComponentBuilder.newBuilder()
            .setPaletteCategory(COMPONENT_CATEGORY)
            .setId(id)
            .setModuleId(MODULE_ID)
            .setSchema(schema(schemaResource))
            .setName(name)
            .setIcon(new ImageIcon(icon))
            .addPaletteEntry("", name, paletteDescription, icon, null)
            .setDefaultMetaName(metaName)
            .setResources(BROWSER_RESOURCES);
        if (events != null && !events.isEmpty()) {
            builder.setEvents(events);
        }
        return builder.build();
    }

    /**
     * A 16x16 palette icon drawn with Java2D (headless-safe, no binary assets):
     * a crescent moon over a screen.
     */
    public static BufferedImage paletteIcon() {
        int s = 16;
        BufferedImage img = new BufferedImage(s, s, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(new Color(0x2E, 0x6F, 0xB5));
        g.setStroke(new BasicStroke(1.2f));
        g.drawRoundRect(1, 2, 13, 10, 2, 2);
        g.drawLine(5, 14, 10, 14);
        g.fillOval(5, 4, 6, 6);
        g.setComposite(java.awt.AlphaComposite.Clear);
        g.fillOval(7, 3, 6, 6);
        g.dispose();
        return img;
    }
}
