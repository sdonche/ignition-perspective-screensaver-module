package com.mustrysolutions.screensaver.gateway;

import static com.mustrysolutions.screensaver.common.MustryScreensaverModule.URL_ALIAS;

import java.util.Optional;

import com.inductiveautomation.ignition.common.licensing.LicenseState;
import com.inductiveautomation.ignition.common.util.LoggerEx;
import com.inductiveautomation.ignition.gateway.model.AbstractGatewayModuleHook;
import com.inductiveautomation.ignition.gateway.model.GatewayContext;
import com.inductiveautomation.perspective.common.api.ComponentRegistry;
import com.inductiveautomation.perspective.gateway.api.ComponentModelDelegateRegistry;
import com.inductiveautomation.perspective.gateway.api.PerspectiveContext;

import com.mustrysolutions.screensaver.common.comp.Components;
import com.mustrysolutions.screensaver.common.comp.IdleGuard;

/**
 * Gateway-scope hook. Registers the components with Perspective, serves the
 * front-end bundle from the module's "mounted" folder at
 * /res/mustry-screensaver/, and runs the shared {@link AlarmFeed} that every
 * Idle Guard's {@link GuardModelDelegate} subscribes to.
 */
public class ScreensaverGatewayHook extends AbstractGatewayModuleHook {

    private static final LoggerEx log = LoggerEx.newBuilder().build("MustrySolutions.Screensaver.GatewayHook");

    private GatewayContext gatewayContext;
    private ComponentRegistry componentRegistry;
    private ComponentModelDelegateRegistry delegateRegistry;
    private AlarmFeed alarmFeed;

    @Override
    public void setup(GatewayContext context) {
        this.gatewayContext = context;
    }

    @Override
    public void startup(LicenseState activationState) {
        PerspectiveContext perspectiveContext = PerspectiveContext.get(this.gatewayContext);
        this.componentRegistry = perspectiveContext.getComponentRegistry();
        if (this.componentRegistry != null) {
            log.info("Registering the Screensaver components.");
            Components.ALL.forEach(this.componentRegistry::registerComponent);
        } else {
            log.error("Perspective component registry not found; Screensaver components not registered.");
        }
        try {
            this.alarmFeed = AlarmFeed.forGateway(this.gatewayContext.getAlarmManager());
        } catch (RuntimeException e) {
            // Without a feed every guard fails open: it never covers the page.
            log.error("Could not start the alarm feed; Idle Guards will not idle.", e);
            this.alarmFeed = null;
        }
        this.delegateRegistry = perspectiveContext.getComponentModelDelegateRegistry();
        if (this.delegateRegistry != null) {
            final AlarmFeed feed = this.alarmFeed;
            this.delegateRegistry.register(IdleGuard.COMPONENT_ID, c -> new GuardModelDelegate(c, feed));
        } else {
            log.error("Component model delegate registry not found; Idle Guards get no alarm feed and will not idle.");
        }
    }

    @Override
    public void shutdown() {
        if (this.delegateRegistry != null) {
            this.delegateRegistry.remove(IdleGuard.COMPONENT_ID);
        }
        if (this.componentRegistry != null) {
            Components.ALL.forEach(d -> this.componentRegistry.removeComponent(d.id()));
        }
        if (this.alarmFeed != null) {
            this.alarmFeed.shutdown();
            this.alarmFeed = null;
        }
    }

    @Override
    public Optional<String> getMountedResourceFolder() {
        return Optional.of("mounted");
    }

    @Override
    public Optional<String> getMountPathAlias() {
        return Optional.of(URL_ALIAS);
    }

    @Override
    public boolean isFreeModule() {
        return true;
    }
}
