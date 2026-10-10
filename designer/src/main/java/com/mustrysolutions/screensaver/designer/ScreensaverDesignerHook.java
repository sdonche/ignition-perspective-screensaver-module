package com.mustrysolutions.screensaver.designer;

import com.inductiveautomation.ignition.common.licensing.LicenseState;
import com.inductiveautomation.ignition.common.util.LoggerEx;
import com.inductiveautomation.ignition.designer.model.AbstractDesignerModuleHook;
import com.inductiveautomation.ignition.designer.model.DesignerContext;
import com.inductiveautomation.perspective.designer.DesignerComponentRegistry;
import com.inductiveautomation.perspective.designer.api.PerspectiveDesignerInterface;

import com.mustrysolutions.screensaver.common.comp.Components;

/** Designer-scope hook: puts the Screensaver components in the Perspective palette. */
public class ScreensaverDesignerHook extends AbstractDesignerModuleHook {

    private static final LoggerEx log = LoggerEx.newBuilder().build("MustrySolutions.Screensaver.DesignerHook");

    private DesignerComponentRegistry registry;

    @Override
    public void startup(DesignerContext context, LicenseState activationState) throws Exception {
        PerspectiveDesignerInterface pdi = PerspectiveDesignerInterface.get(context);
        this.registry = pdi.getDesignerComponentRegistry();
        log.info("Registering the Screensaver components in the Designer.");
        Components.ALL.forEach(this.registry::registerComponent);
    }

    @Override
    public void shutdown() {
        if (this.registry != null) {
            Components.ALL.forEach(d -> this.registry.removeComponent(d.id()));
        }
    }
}
