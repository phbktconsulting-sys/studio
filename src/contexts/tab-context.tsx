'use client';

import { createContext, useContext, useState, useCallback, type ReactNode, useEffect } from 'react';
import { useUser } from '@/firebase';

export interface Tab {
  id: string;
  title: string;
  type: 'static' | 'work-item' | 'user';
}

interface TabContextType {
  tabs: Tab[];
  activeTab: string;
  openTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

const baseStaticTabs: Tab[] = [
  { id: 'my-work', title: 'My Work', type: 'static' },
  { id: 'search', title: 'Search', type: 'static' },
  { id: 'global-notes', title: 'Global Notes', type: 'static' },
];

const adminTab: Tab = { id: 'admin', title: 'Admin', type: 'static' };

export function TabProvider({ children }: { children: ReactNode }) {
  const { user, role, isUserLoading } = useUser();
  const [tabs, setTabs] = useState<Tab[]>(baseStaticTabs);
  const [activeTab, setActiveTab] = useState<string>('my-work');

  useEffect(() => {
    // Wait until user loading is complete
    if (isUserLoading) return;
  
    const isAdmin = role === 'Admin';
    const hasAdminTab = tabs.some(tab => tab.id === 'admin');

    if (isAdmin && !hasAdminTab) {
      const newTabs = [adminTab, ...baseStaticTabs];
      setTabs(newTabs);
      // If the current user logs in and they are an admin,
      // set the active tab to 'admin'.
      setActiveTab('admin');
    } else if (!isAdmin && hasAdminTab) {
      // If a non-admin user is detected and the admin tab is present, remove it.
      setTabs(baseStaticTabs);
      // If the active tab was the admin tab, switch to 'my-work'.
      if (activeTab === 'admin') {
        setActiveTab('my-work');
      }
    }
  }, [role, isUserLoading, tabs, activeTab]);

  const openTab = useCallback((newTab: Tab) => {
    setTabs((prevTabs) => {
      if (prevTabs.some((tab) => tab.id === newTab.id)) {
        return prevTabs;
      }
      return [...prevTabs, newTab];
    });
    setActiveTab(newTab.id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const tabToCloseIndex = prevTabs.findIndex((tab) => tab.id === tabId);
      if (tabToCloseIndex === -1) return prevTabs;

      // Determine the new active tab BEFORE filtering
      if (activeTab === tabId) {
        // If there's a tab after the one being closed, activate it
        if (tabToCloseIndex < prevTabs.length - 1) {
            setActiveTab(prevTabs[tabToCloseIndex + 1].id);
        } else { // Otherwise, activate the one before it
            setActiveTab(prevTabs[tabToCloseIndex - 1].id);
        }
      }
      
      return prevTabs.filter((tab) => tab.id !== tabId);
    });
  }, [activeTab]);

  const value = {
    tabs,
    activeTab,
    openTab,
    closeTab,
    setActiveTab,
  };

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

export function useTabs() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
}
