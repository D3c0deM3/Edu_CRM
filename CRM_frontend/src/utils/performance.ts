/**
 * Debounce helper to prevent duplicate API calls
 * Useful for search, filter, and form submission
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle helper to limit function calls over time
 * Useful for scroll, resize, and other high-frequency events
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Batch multiple function calls into a single async operation
 * Useful for batching API requests
 */
export class RequestBatcher<T> {
  private queue: Array<() => Promise<T>> = [];
  private processing = false;
  private batchDelay: number;

  constructor(batchDelay: number = 50) {
    this.batchDelay = batchDelay;
  }

  async add(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        const result = await request();
        resolve(result);
        return result;
      });

      if (!this.processing) {
        this.processBatch();
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    // Wait a bit to batch more requests
    await new Promise((resolve) => setTimeout(resolve, this.batchDelay));

    const batch = this.queue.splice(0, this.queue.length);

    try {
      await Promise.all(batch.map((req) => req()));
    } catch (error) {
      console.error('Batch processing error:', error);
    }

    this.processing = false;

    // Process remaining requests
    if (this.queue.length > 0) {
      this.processBatch();
    }
  }
}
