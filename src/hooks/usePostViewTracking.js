// hooks/usePostViewTracking.js
import { useEffect, useRef } from 'react';

export const usePostViewTracking = (post, onView, options = {}) => {
  const {
    threshold = 0.5,
    rootMargin = '0px',
    enableOnFocus = false, // Key flag to prevent auto-scroll issues
    debounceDelay = 100
  } = options;

  const observerRef = useRef(null);
  const timeoutRef = useRef(null);
  const hasViewedRef = useRef(false);
  const isDocumentVisibleRef = useRef(true);
  const justBecameVisibleRef = useRef(false);
  const gracePeriodTimeoutRef = useRef(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    // Track document visibility to prevent unwanted triggers on browser return
    const handleVisibilityChange = () => {
      const wasHidden = !isDocumentVisibleRef.current;
      isDocumentVisibleRef.current = !document.hidden;
      
      if (document.hidden) {
        // Clear any pending view tracking when tab becomes hidden
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (gracePeriodTimeoutRef.current) {
          clearTimeout(gracePeriodTimeoutRef.current);
          gracePeriodTimeoutRef.current = null;
        }
        justBecameVisibleRef.current = false;
      } else if (wasHidden) {
        // User just returned to the tab - set grace period
        justBecameVisibleRef.current = true;
        
        // Clear any existing grace period timeout
        if (gracePeriodTimeoutRef.current) {
          clearTimeout(gracePeriodTimeoutRef.current);
        }
        
        // Disconnect observer immediately to prevent any immediate triggers
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
        
        // Set a longer grace period to prevent immediate view tracking
        gracePeriodTimeoutRef.current = setTimeout(() => {
          justBecameVisibleRef.current = false;
          // Don't automatically reconnect observer - let it reconnect naturally
        }, 3000); // Increased to 3 seconds
      }
    };

    const handleFocus = () => {
      // Additional protection on window focus
      if (!enableOnFocus) {
        justBecameVisibleRef.current = true;
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
        
        if (gracePeriodTimeoutRef.current) {
          clearTimeout(gracePeriodTimeoutRef.current);
        }
        
        gracePeriodTimeoutRef.current = setTimeout(() => {
          justBecameVisibleRef.current = false;
        }, 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Set initial load protection
    setTimeout(() => {
      initialLoadRef.current = false;
    }, 1000);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (gracePeriodTimeoutRef.current) {
        clearTimeout(gracePeriodTimeoutRef.current);
      }
    };
  }, [enableOnFocus]);

  useEffect(() => {
    if (!post || !post._id || !onView) {
      return;
    }

    const originalPostId = post._originalId || post._id.split('_cycle_')[0] || post._id;
    const viewKey = `viewed_post_${originalPostId}`;
    
    // Check if already viewed
    if (sessionStorage.getItem(viewKey)) {
      return;
    }

    // Reset viewed state when post changes
    hasViewedRef.current = false;

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasViewedRef.current) {
          // Enhanced checks to prevent unwanted triggers
          const shouldTrackView = enableOnFocus || (
            isDocumentVisibleRef.current && 
            !justBecameVisibleRef.current && // Don't track if user just returned to tab
            !initialLoadRef.current // Don't track during initial page load
          );
          
          if (!shouldTrackView) {
            return;
          }

          // Debounce the view tracking with longer delay for safety
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(() => {
            // Quadruple-check conditions before tracking
            if (!hasViewedRef.current && 
                entry.target && 
                entry.isIntersecting && 
                !justBecameVisibleRef.current &&
                !initialLoadRef.current &&
                isDocumentVisibleRef.current) {
              sessionStorage.setItem(viewKey, 'true');
              onView(post._id);
              hasViewedRef.current = true;
              
              // Cleanup observer after successful view
              if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
              }
            }
          }, Math.max(debounceDelay, 200)); // Minimum 200ms delay
        }
      });
    };

    // Don't create observer if we're in grace period
    if (justBecameVisibleRef.current || initialLoadRef.current) {
      return;
    }

    // Create observer with configurable options
    observerRef.current = new IntersectionObserver(observerCallback, {
      threshold,
      rootMargin,
      root: null // Use viewport as root
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [post._id, onView, threshold, rootMargin, enableOnFocus, debounceDelay]);

  // Return function to attach to DOM element
  const attachObserver = (element) => {
    if (element && observerRef.current && !hasViewedRef.current) {
      // Additional checks to prevent immediate attachment
      if (justBecameVisibleRef.current || initialLoadRef.current) {
        return;
      }
      if (!enableOnFocus && !isDocumentVisibleRef.current) {
        return;
      }
      observerRef.current.observe(element);
    }
  };

  // Return function to detach observer
  const detachObserver = () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  };

  return { attachObserver, detachObserver, hasViewed: hasViewedRef.current };
};