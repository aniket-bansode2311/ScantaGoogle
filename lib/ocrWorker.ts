import React from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { OCRLanguage } from '@/contexts/OCRSettingsContext';

export interface OCRTask {
  id: string;
  imageUri: string;
  language: OCRLanguage;
  onProgress?: (progress: string) => void;
}

export interface OCRResult {
  id: string;
  text: string;
  error?: string;
}

class OCRWorkerManager {
  private workers: Worker[] = [];
  private taskQueue: OCRTask[] = [];
  private activeTasks: Map<string, OCRTask> = new Map();
  private maxWorkers = Platform.OS === 'web' ? 2 : 1; // Limit workers on mobile
  private isProcessing = false;

  constructor() {
    if (Platform.OS === 'web') {
      this.initializeWebWorkers();
    }
  }

  private initializeWebWorkers() {
    // Web Workers are not directly supported in React Native Web
    // We'll use a different approach for web
  }

  private getLanguagePrompt(languageCode: OCRLanguage): string {
    const languageMap: Record<OCRLanguage, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'auto': 'Auto-detect',
    };
    return languageMap[languageCode] || 'English';
  }

  private async processImageToBase64(imageUri: string): Promise<string> {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async performOCR(task: OCRTask): Promise<OCRResult> {
    try {
      console.log(`🚀 Starting OCR for task ${task.id}`);
      
      task.onProgress?.('Converting image to base64...');
      const base64Data = await this.processImageToBase64(task.imageUri);
      
      task.onProgress?.('Sending to AI for text extraction...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const aiResponse = await fetch(
        Constants.expoConfig?.extra?.rorkAiApiUrl || "https://toolkit.rork.com/text/llm/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Extract text from this image quickly. ${
                      task.language !== 'auto' 
                        ? `The text is primarily in ${this.getLanguagePrompt(task.language)}.` 
                        : 'Auto-detect the language.'
                    } Return only the text content, no formatting or commentary.`,
                  },
                  {
                    type: "image",
                    image: base64Data,
                  },
                ],
              },
            ],
          }),
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!aiResponse.ok) {
        throw new Error(`AI API error: ${aiResponse.status}`);
      }
      
      const data = await aiResponse.json();
      const text = data.completion || "No text detected";
      
      console.log(`✅ OCR completed for task ${task.id}: ${text.length} characters`);
      
      return {
        id: task.id,
        text,
      };
    } catch (error: any) {
      console.error(`❌ OCR failed for task ${task.id}:`, error);
      return {
        id: task.id,
        text: '',
        error: error.message || 'OCR processing failed',
      };
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    // Process tasks in parallel (limited by maxWorkers)
    const promises: Promise<OCRResult>[] = [];
    const tasksToProcess = this.taskQueue.splice(0, this.maxWorkers);
    
    for (const task of tasksToProcess) {
      this.activeTasks.set(task.id, task);
      promises.push(this.performOCR(task));
    }
    
    try {
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        const task = tasksToProcess[index];
        this.activeTasks.delete(task.id);
        
        if (result.status === 'fulfilled') {
          this.notifyResult(result.value);
        } else {
          this.notifyResult({
            id: task.id,
            text: '',
            error: result.reason?.message || 'Processing failed',
          });
        }
      });
    } catch (error) {
      console.error('Error processing OCR queue:', error);
    } finally {
      this.isProcessing = false;
      
      // Process remaining tasks
      if (this.taskQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  private notifyResult(result: OCRResult) {
    // Emit result to listeners
    const event = new CustomEvent('ocrResult', { detail: result });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(event);
    }
  }

  public addTask(task: OCRTask): void {
    console.log(`📝 Adding OCR task ${task.id} to queue`);
    this.taskQueue.push(task);
    
    // Start processing immediately
    setTimeout(() => this.processQueue(), 0);
  }

  public cancelTask(taskId: string): void {
    // Remove from queue
    this.taskQueue = this.taskQueue.filter(task => task.id !== taskId);
    
    // Remove from active tasks (note: can't cancel ongoing requests easily)
    this.activeTasks.delete(taskId);
    
    console.log(`🚫 Cancelled OCR task ${taskId}`);
  }

  public getQueueStatus(): { queueLength: number; activeTasks: number } {
    return {
      queueLength: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
    };
  }
}

// Singleton instance
export const ocrWorkerManager = new OCRWorkerManager();

// Hook for using OCR worker in React components
export function useOCRWorker() {
  const [results, setResults] = React.useState<Map<string, OCRResult>>(new Map());
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  React.useEffect(() => {
    const handleResult = (event: CustomEvent<OCRResult>) => {
      const result = event.detail;
      setResults(prev => new Map(prev.set(result.id, result)));
      
      // Update processing status
      const status = ocrWorkerManager.getQueueStatus();
      setIsProcessing(status.queueLength > 0 || status.activeTasks > 0);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('ocrResult', handleResult as EventListener);
      
      return () => {
        window.removeEventListener('ocrResult', handleResult as EventListener);
      };
    }
  }, []);
  
  const submitTask = React.useCallback((task: OCRTask) => {
    setIsProcessing(true);
    ocrWorkerManager.addTask(task);
  }, []);
  
  const cancelTask = React.useCallback((taskId: string) => {
    ocrWorkerManager.cancelTask(taskId);
    setResults(prev => {
      const newResults = new Map(prev);
      newResults.delete(taskId);
      return newResults;
    });
  }, []);
  
  const getResult = React.useCallback((taskId: string) => {
    return results.get(taskId);
  }, [results]);
  
  const clearResults = React.useCallback(() => {
    setResults(new Map());
  }, []);
  
  return {
    submitTask,
    cancelTask,
    getResult,
    clearResults,
    isProcessing,
    queueStatus: ocrWorkerManager.getQueueStatus(),
  };
}

// For non-React usage
export { ocrWorkerManager as default };