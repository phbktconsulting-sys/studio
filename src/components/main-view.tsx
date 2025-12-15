'use client';

import { AppHeader } from '@/components/app-header';
import { MyWorkDashboard } from '@/components/my-work-dashboard';
import { WorkItemView } from '@/components/work-item-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTabs } from '@/contexts/tab-context';
import { XIcon } from 'lucide-react';
import type { Tab } from '@/contexts/tab-context';

export function MainView() {
  const { tabs, activeTab, setActiveTab, closeTab } = useTabs();

  const renderTabContent = (tab: Tab) => {
    switch (tab.id) {
      case 'my-work':
        return <MyWorkDashboard />;
      case 'search':
        return <div className="p-6">Search Functionality (Not Implemented)</div>;
      case 'global-notes':
        return <div className="p-6">Global Notes (Not Implemented)</div>;
      default:
        if (tab.type === 'work-item') {
          return <WorkItemView workItemId={tab.id} />;
        }
        return null;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader />
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <div className="border-b">
            <TabsList className="h-auto rounded-none bg-transparent p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-none"
                >
                  {tab.title}
                  {tab.type !== 'static' && (
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
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex-1 overflow-y-auto">
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0 h-full">
                {renderTabContent(tab)}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
