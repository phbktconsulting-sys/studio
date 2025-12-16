
'use client';

import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Tab } from '@/contexts/tab-context';
import type { WorkItem } from '@/lib/types';
import { TabsTrigger } from './ui/tabs';
import { useTabs } from '@/contexts/tab-context';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkItemTabTriggerProps {
  tab: Tab;
}

export function WorkItemTabTrigger({ tab }: WorkItemTabTriggerProps) {
  const { firestore } = useFirebase();
  const { closeTab } = useTabs();

  const workItemRef = useMemoFirebase(() => {
    if (!firestore || !tab.id) return null;
    return doc(firestore, 'work_items', tab.id);
  }, [firestore, tab.id]);

  const { data: workItem } = useDoc<WorkItem>(workItemRef);

  const isClosed = workItem?.status === 'Closed';

  return (
    <TabsTrigger
      key={tab.id}
      value={tab.id}
      className={cn(
        "relative h-7 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-4 text-xs text-white hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none",
        isClosed && "line-through"
      )}
    >
      {tab.title}
      <div
        role="button"
        aria-label="Close tab"
        onClick={(e) => {
          e.stopPropagation();
          closeTab(tab.id);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground opacity-50 hover:bg-accent hover:text-accent-foreground hover:opacity-100"
      >
        <XIcon className="h-3.5 w-3.5" />
      </div>
    </TabsTrigger>
  );
}
