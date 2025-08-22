import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScanResult } from "@/types/scan";

const STORAGE_KEY = "scan_history";

export function useScanHistory() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedScans = JSON.parse(stored).map((scan: any) => ({
          ...scan,
          timestamp: new Date(scan.timestamp),
        }));
        setScans(parsedScans.sort((a: ScanResult, b: ScanResult) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        ));
      }
    } catch (error) {
      console.error("Error loading scans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveScans = async (newScans: ScanResult[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newScans));
    } catch (error) {
      console.error("Error saving scans:", error);
    }
  };

  const addScan = (scan: ScanResult) => {
    const updatedScans = [scan, ...scans];
    setScans(updatedScans);
    saveScans(updatedScans);
  };

  const removeScan = (id: string) => {
    const updatedScans = scans.filter(scan => scan.id !== id);
    setScans(updatedScans);
    saveScans(updatedScans);
  };

  const clearAllScans = () => {
    setScans([]);
    saveScans([]);
  };

  return {
    scans,
    isLoading,
    addScan,
    removeScan,
    clearAllScans,
  };
}