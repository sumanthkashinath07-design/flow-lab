import * as Tabs from '@radix-ui/react-tabs';
import { Activity, Wind } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ExperimentId } from '../types';

interface ExperimentTabsProps {
  children: ReactNode;
  active: ExperimentId;
  onChange: (id: ExperimentId) => void;
}

export default function ExperimentTabs({ children, active, onChange }: ExperimentTabsProps) {
  return (
    <Tabs.Root className="tabs-root" value={active} onValueChange={(id) => onChange(id as ExperimentId)}>
      <Tabs.List className="experiment-tabs" aria-label="CO 4 laboratory experiments">
        <Tabs.Trigger className="experiment-tab" value="reynolds">
          <span className="tab-icon"><Activity size={16} /></span>
          <span className="tab-copy"><small>CO 4 · EXP 07</small><strong>Reynolds' Experiment</strong><em>Flow regimes</em></span>
          <span className="tab-arrow">↗</span>
        </Tabs.Trigger>
        <Tabs.Trigger className="experiment-tab" value="aerofoil">
          <span className="tab-icon"><Wind size={16} /></span>
          <span className="tab-copy"><small>CO 4 · EXP 11</small><strong>Aerofoil pressure</strong><em>Surface distribution</em></span>
          <span className="tab-arrow">↗</span>
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content className="tab-panel" value={active} tabIndex={0}>{children}</Tabs.Content>
    </Tabs.Root>
  );
}
