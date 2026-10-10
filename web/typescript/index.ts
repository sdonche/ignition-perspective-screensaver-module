import { ComponentMeta, ComponentRegistry } from '@inductiveautomation/perspective-client';
import { IdleGuard, IdleGuardMeta } from './components/guard/IdleGuard';

import './scss/guard.scss';

export { IdleGuard };

const components: Array<ComponentMeta> = [new IdleGuardMeta()];
components.forEach((c: ComponentMeta) => ComponentRegistry.register(c));
