'use client';

import { AppHeader } from '@/components/app-header';
import { MyWorkDashboard } from '@/components/my-work-dashboard';
import { WorkItemView } from '@/components/work-item-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTabs } from '@/contexts/tab-context';
import { XIcon } from 'lucide-react';
import type { Tab } from '@/contexts/tab-context';
import { AdminDashboard } from './admin-dashboard';
import { NewWorkItemView } from './new-work-item-view';
import { SearchView } from './search-view';
import { BatchWorkCreate } from './batch-work-create';
import { GlobalNotesView } from './global-notes-view';

export function MainView() {
  const { tabs, activeTab, setActiveTab, closeTab } = useTabs();

  const renderTabContent = (tab: Tab) => {
    switch (tab.id) {
      case 'admin':
        return <AdminDashboard />;
      case 'my-work':
        return <MyWorkDashboard />;
      case 'search':
        return <SearchView />;
      case 'global-notes':
        return <GlobalNotesView />;
      case 'new-work-item':
        return <NewWorkItemView />;
      case 'batch-create':
        return <BatchWorkCreate onBack={() => closeTab('batch-create')} />;
      default:
        if (tab.type === 'work-item') {
          return <WorkItemView workItemId={tab.id} customId={tab.title} />;
        }
        return null;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader />
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <div className="border-b border-[#A60A0A]">
            <TabsList className="h-auto rounded-none bg-transparent p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative flex h-7 items-center gap-2 rounded-none border-b-2 border-transparent bg-[#A60A0A] px-4 text-xs text-white hover:bg-[#A60A0A]/80 data-[state=active]:border-transparent data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <span>{tab.title}</span>
                  {tab.type !== 'static' && (
                    <div
                      role="button"
                      aria-label="Close tab"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="z-10 rounded-sm p-0.5 text-white/70 opacity-100 hover:bg-white/10 hover:text-white"
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
