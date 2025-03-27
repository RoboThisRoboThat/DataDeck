import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { AppSettings, AISettings } from '../types/settings';

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (settings: AppSettings) => Promise<void>;
  updateAISettings: (aiSettings: AISettings) => Promise<void>;
}

const defaultSettings: AppSettings = {
  ai: {
    openaiApiKey: '',
    claudeApiKey: ''
  }
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
  updateSettings: async () => {},
  updateAISettings: async () => {}
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        // Check if window.store is available before trying to use it
        if (window.store?.getSettings) {
          const storedSettings = await window.store.getSettings();
          
          // If we have valid storedSettings, use them
          if (storedSettings && typeof storedSettings === 'object') {
            // Ensure the AI settings are properly initialized
            const aiSettings = storedSettings.ai || defaultSettings.ai;
            
            setSettings({
              ...storedSettings,
              ai: {
                openaiApiKey: aiSettings.openaiApiKey || '',
                claudeApiKey: aiSettings.claudeApiKey || ''
              }
            });
          } else {
            // Otherwise use default settings
            console.log('No stored settings found, using defaults');
            setSettings(defaultSettings);
          }
        } else {
          console.error('window.store.getSettings is not available');
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      if (!window.store?.updateSettings) {
        throw new Error('window.store.updateSettings is not available');
      }
      
      const updatedSettings = await window.store.updateSettings(newSettings);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  };

  const updateAISettings = async (aiSettings: AISettings) => {
    try {
      if (!window.store?.updateAISettings) {
        throw new Error('window.store.updateAISettings is not available');
      }
      
      // Ensure we're not sending undefined values
      const sanitizedAISettings = {
        openaiApiKey: aiSettings.openaiApiKey || '',
        claudeApiKey: aiSettings.claudeApiKey || ''
      };
      
      const updatedAISettings = await window.store.updateAISettings(sanitizedAISettings);
      
      setSettings(prev => ({
        ...prev,
        ai: updatedAISettings
      }));
      
      return updatedAISettings;
    } catch (error) {
      console.error('Failed to update AI settings:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateSettings,
        updateAISettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}; 