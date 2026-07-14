"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ZoomOverlay
 * ───────────
 * Full-screen zoom viewer opened from the product carousel's magnifier
 * button. Shows the already-loaded *display* image instantly (blurred up
 * as a placeholder — no blank flash), fetches the full-res *zoom* image
 * in the background, and swaps it in once loaded.
 *
 * Gestures (all hand-rolled, no deps — same native-listener approach as
 * ProductCard's carousel, since React's synthetic touch handlers are
 * passive and can't call preventDefault):
 *   • Pinch to zoom / scroll to zoom, anchored under your fingers/cursor
 *   • Drag to pan once zoomed in
 *   • Double-tap / double-click to toggle between 1x and 2.5x
 *   • Swipe down to dismiss (only when not zoomed in)
 *   • Swipe left/right to go to next/prev image (only when not zoomed in)
 *   • Tap the backdrop, tap ✕, or press Esc to close
 *   • Android back button → closes overlay (via history/popstate)
 *
 * The "Instagram effect": pinching past the zoom limits, or panning past
 * the image edges, doesn't hard-stop — it stretches a little further
 * (rubber-band, dampened) and then *springs back* into bounds the moment
 * you let go. Same idea powers the swipe-to-dismiss: drag a little and
 * it snaps back; drag past the threshold (or flick it) and it follows
 * through and closes.
 */

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const RUBBER_BAND = 0.55; // how "stretchy" overscroll feels (0–1, lower = stiffer)
const TAP_MOVE_TOLERANCE = 10; // px — below this, a touch is a "tap" not a drag
const DOUBLE_TAP_WINDOW = 300; // ms between taps to count as a double-tap
const CLOSE_DRAG_THRESHOLD = 110; // px of downward drag that commits to closing
const CLOSE_VELOCITY_THRESHOLD = 0.55; // px/ms flick speed that commits to closing
const CAROUSEL_DRAG_THRESHOLD = 60; // px of horizontal drag to switch images
const CAROUSEL_FLICK_THRESHOLD = 0.3; // px/ms flick speed to switch images

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Dampened overscroll: lets a value drift past [min, max] but resists it,
// so it always feels like it's being stretched rather than just ignored.
function rubberband(v, min, max, factor = RUBBER_BAND) {
  if (v < min) return min - (min - v) * factor;
  if (v > max) return max + (v - max) * factor;
  return v;
}

function distance(t0, t1) {
  const dx = t0.clientX - t1.clientX;
  const dy = t0.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function ZoomOverlay({
  displaySrc,
  zoomSrc,
  alt,
  onClose,
  images = [],
  imageIndex = 0,
  onImageChange = () => {},
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragScale, setDragScale] = useState(0.94); // entrance pop-in / dismiss shrink
  const [backdropOpacity, setBackdropOpacity] = useState(0); // entrance fade-in
  const [springBack, setSpringBack] = useState(false); // toggles the CSS transition
  const [zoomLoaded, setZoomLoaded] = useState(false);

  const containerRef = useRef(null);
  const closedRef = useRef(false); // guards against double-firing onClose
  const clickTimeoutRef = useRef(null); // lets a dblclick cancel a pending single-click close

  // Mirror render state into refs so native (non-passive) listeners —
  // attached once — always read fresh values without re-binding.
  const scaleRef = useRef(scale);
  const txRef = useRef(tx);
  const tyRef = useRef(ty);

  useEffect(() => {
    scaleRef.current = scale;
    txRef.current = tx;
    tyRef.current = ty;
  }, [scale, tx, ty]);

  const naturalSizeRef = useRef(null); // { w, h } of the actual photo
  const baseSizeRef = useRef(null); // rendered size at scale=1 (object-contain)
  const containerSizeRef = useRef({ w: 0, h: 0 });
  const gestureRef = useRef({ mode: null });
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  const recomputeBaseSize = useCallback(() => {
    const el = containerRef.current;
    const natural = naturalSizeRef.current;
    if (!el || !natural) return;
    const rect = el.getBoundingClientRect();
    containerSizeRef.current = { w: rect.width, h: rect.height };
    const containerRatio = rect.width / rect.height;
    const imgRatio = natural.w / natural.h;
    baseSizeRef.current =
      imgRatio > containerRatio
        ? { w: rect.width, h: rect.width / imgRatio }
        : { w: rect.height * imgRatio, h: rect.height };
  }, []);

  const getBounds = useCallback((s) => {
    const base = baseSizeRef.current;
    const cont = containerSizeRef.current;
    if (!base || !cont.w) return { maxX: 0, maxY: 0 };
    return {
      maxX: Math.max(0, (base.w * s - cont.w) / 2),
      maxY: Math.max(0, (base.h * s - cont.h) / 2),
    };
  }, []);

  const handleImageMeta = useCallback(
    (naturalWidth, naturalHeight) => {
      if (!naturalSizeRef.current) {
        naturalSizeRef.current = { w: naturalWidth, h: naturalHeight };
      }
      recomputeBaseSize();
    },
    [recomputeBaseSize],
  );

  // ── Entrance animation ──
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSpringBack(true);
      setDragScale(1);
      setBackdropOpacity(1);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Lock page scroll while open, restore on close ──
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const closeNow = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  const dismissSimple = useCallback(() => {
    setSpringBack(true);
    setBackdropOpacity(0);
    setDragScale(0.94);
    setTimeout(closeNow, 180);
  }, [closeNow]);

  // ── Android back button: push dummy history entry on mount, pop on close ──
  // (Placed after dismissSimple definition to avoid hoisting issues)
  useEffect(() => {
    // Push a dummy state so hitting the back button fires popstate instead of
    // navigating away from the page. The state object identifies this as a
    // zoom overlay.
    window.history.pushState({ zoomOverlayOpen: true }, "");

    function onPopState(e) {
      // User hit the back button. If the state is ours (zoomOverlayOpen),
      // close the overlay and re-push so the next back goes to the actual
      // previous page.
      if (e.state?.zoomOverlayOpen) {
        dismissSimple();
        window.history.pushState({ zoomOverlayOpen: true }, "");
      }
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [dismissSimple]);

  const dismissWithFling = useCallback(
    (finalDy, velocity) => {
      setSpringBack(true);
      const flung = Math.max(finalDy * 1.4, finalDy + velocity * 180, 420);
      setTy(flung);
      setBackdropOpacity(0);
      setDragScale(0.6);
      setTimeout(closeNow, 200);
    },
    [closeNow],
  );

  // ── Esc to close, arrow keys to navigate, resize handling ──
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") dismissSimple();
      if (e.key === "ArrowLeft" && scaleRef.current < 1.01) {
        // Only allow carousel navigation when not zoomed in
        // Loop: go to last image if at first
        const prev = (imageIndex - 1 + images.length) % images.length;
        onImageChange(prev);
      }
      if (e.key === "ArrowRight" && scaleRef.current < 1.01) {
        // Only allow carousel navigation when not zoomed in
        // Loop: go to first image if at last
        const next = (imageIndex + 1) % images.length;
        onImageChange(next);
      }
    }
    function onResize() {
      recomputeBaseSize();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [
    dismissSimple,
    recomputeBaseSize,
    imageIndex,
    images.length,
    onImageChange,
  ]);

  const applyDoubleTap = useCallback(
    (clientX, clientY) => {
      const rect = containerRef.current.getBoundingClientRect();
      const px = clientX - (rect.left + rect.width / 2);
      const py = clientY - (rect.top + rect.height / 2);

      setSpringBack(true);
      if (scaleRef.current > 1.01) {
        setScale(1);
        setTx(0);
        setTy(0);
      } else {
        const b = getBounds(DOUBLE_TAP_SCALE);
        setScale(DOUBLE_TAP_SCALE);
        setTx(clamp(px * (1 - DOUBLE_TAP_SCALE), -b.maxX, b.maxX));
        setTy(clamp(py * (1 - DOUBLE_TAP_SCALE), -b.maxY, b.maxY));
      }
    },
    [getBounds],
  );

  // ── Touch (mobile): pinch-zoom, pan, swipe-to-dismiss, double-tap ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e) {
      if (e.touches.length === 2) {
        const [t0, t1] = e.touches;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const midX = (t0.clientX + t1.clientX) / 2 - cx;
        const midY = (t0.clientY + t1.clientY) / 2 - cy;
        gestureRef.current = {
          mode: "pinch",
          startDistance: distance(t0, t1),
          startScale: scaleRef.current,
          startLocalX: (midX - txRef.current) / scaleRef.current,
          startLocalY: (midY - tyRef.current) / scaleRef.current,
        };
        setSpringBack(false);
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        const isZoomed = scaleRef.current > 1.01;
        gestureRef.current = {
          mode: isZoomed ? "pan" : "tap-or-close",
          startX: t.clientX,
          startY: t.clientY,
          startTx: txRef.current,
          startTy: tyRef.current,
          startTime: Date.now(),
          moved: false,
        };
        setSpringBack(false);
      }
    }

    function onTouchMove(e) {
      const g = gestureRef.current;
      if (!g || !g.mode) return;

      if (g.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const [t0, t1] = e.touches;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const midX = (t0.clientX + t1.clientX) / 2 - cx;
        const midY = (t0.clientY + t1.clientY) / 2 - cy;
        const rawScale = g.startScale * (distance(t0, t1) / g.startDistance);
        const newScale = rubberband(rawScale, MIN_SCALE, MAX_SCALE);
        const b = getBounds(newScale);
        const newTx = rubberband(
          midX - g.startLocalX * newScale,
          -b.maxX,
          b.maxX,
        );
        const newTy = rubberband(
          midY - g.startLocalY * newScale,
          -b.maxY,
          b.maxY,
        );
        setScale(newScale);
        setTx(newTx);
        setTy(newTy);
        return;
      }

      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - g.startX;
      const dy = t.clientY - g.startY;

      if (g.mode === "pan") {
        e.preventDefault();
        const b = getBounds(scaleRef.current);
        setTx(rubberband(g.startTx + dx, -b.maxX, b.maxX));
        setTy(rubberband(g.startTy + dy, -b.maxY, b.maxY));
        return;
      }

      if (g.mode === "tap-or-close") {
        if (
          !g.moved &&
          Math.abs(dx) < TAP_MOVE_TOLERANCE &&
          Math.abs(dy) < TAP_MOVE_TOLERANCE
        ) {
          return; // still deciding
        }
        g.moved = true;
        // Decide: is this a horizontal (carousel) or vertical (dismiss) swipe?
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal swipe — carousel navigation
          g.mode = "carousel-swipe";
          g.startX = e.touches[0].clientX;
          return;
        } else if (dy > 0) {
          // Vertical downward — dismiss gesture
          g.mode = "close-drag";
        } else {
          // Vertical upward — ignore
          g.mode = "ignore";
          return;
        }
      }

      if (g.mode === "carousel-swipe") {
        e.preventDefault();
        const swipeX = e.touches[0].clientX - g.startX;
        // Optionally animate a preview of the next/prev image...
        // For now, we just track it; the actual navigation happens on touchend.
        return;
      }

      if (g.mode === "close-drag") {
        e.preventDefault();
        const clampedDy = dy > 0 ? dy : dy * 0.25;
        setTy(clampedDy);
        setDragScale(clamp(1 - clampedDy / 1400, 0.72, 1));
        setBackdropOpacity(clamp(1 - clampedDy / 500, 0.25, 1));
      }
    }

    function onTouchEnd(e) {
      const g = gestureRef.current;
      if (!g || !g.mode) return;

      // We've fully handled this gesture ourselves — suppress the ghost
      // "click" event mobile browsers fire ~afterward, so it doesn't
      // double-trigger the desktop click/dblclick handlers below.
      if (g.mode !== "ignore" && e.cancelable) e.preventDefault();

      if (g.mode === "pinch") {
        const finalScale = clamp(scaleRef.current, MIN_SCALE, MAX_SCALE);
        const b = getBounds(finalScale);
        setSpringBack(true);
        setScale(finalScale);
        setTx(clamp(txRef.current, -b.maxX, b.maxX));
        setTy(clamp(tyRef.current, -b.maxY, b.maxY));
      } else if (g.mode === "pan") {
        const b = getBounds(scaleRef.current);
        setSpringBack(true);
        setTx(clamp(txRef.current, -b.maxX, b.maxX));
        setTy(clamp(tyRef.current, -b.maxY, b.maxY));
      } else if (g.mode === "carousel-swipe") {
        // User swiped left or right to navigate images
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - g.startX;
        const duration = Math.max(1, Date.now() - g.startTime);
        const velocity = Math.abs(deltaX) / duration;
        const isFlick = velocity > CAROUSEL_FLICK_THRESHOLD;
        const isDrag = Math.abs(deltaX) > CAROUSEL_DRAG_THRESHOLD;
        if ((isFlick || isDrag) && Math.abs(deltaX) > 10) {
          // Swiped far enough — navigate to next/prev image with looping
          const direction = deltaX > 0 ? -1 : 1; // right swipe → prev, left swipe → next
          const newIndex =
            (imageIndex + direction + images.length) % images.length;
          onImageChange(newIndex);
        }
      } else if (g.mode === "close-drag") {
        const dy = tyRef.current;
        const duration = Math.max(1, Date.now() - g.startTime);
        const velocity = dy / duration;
        if (dy > CLOSE_DRAG_THRESHOLD || velocity > CLOSE_VELOCITY_THRESHOLD) {
          dismissWithFling(dy, velocity);
        } else {
          setSpringBack(true);
          setTy(0);
          setDragScale(1);
          setBackdropOpacity(1);
        }
      } else if (g.mode === "tap-or-close" && !g.moved) {
        // A clean tap with (almost) no movement.
        const touch = e.changedTouches[0];
        const now = Date.now();
        const last = lastTapRef.current;
        const tapDist = Math.hypot(
          touch.clientX - last.x,
          touch.clientY - last.y,
        );
        if (now - last.time < DOUBLE_TAP_WINDOW && tapDist < 40) {
          applyDoubleTap(touch.clientX, touch.clientY);
          lastTapRef.current = { time: 0, x: 0, y: 0 };
        } else {
          lastTapRef.current = {
            time: now,
            x: touch.clientX,
            y: touch.clientY,
          };
          // Single tap on the image itself does nothing (matches the
          // "tap outside to close, tap image to inspect" convention).
        }
      }

      gestureRef.current = { mode: null };
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [
    getBounds,
    applyDoubleTap,
    dismissWithFling,
    imageIndex,
    images.length,
    onImageChange,
  ]);

  // ── Desktop: scroll-to-zoom, anchored at the cursor ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e) {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - (rect.left + rect.width / 2);
      const py = e.clientY - (rect.top + rect.height / 2);
      const factor = 1 - e.deltaY * 0.0022;
      const newScale = clamp(scaleRef.current * factor, MIN_SCALE, MAX_SCALE);
      const localX = (px - txRef.current) / scaleRef.current;
      const localY = (py - tyRef.current) / scaleRef.current;
      const b = getBounds(newScale);
      setSpringBack(false);
      setScale(newScale);
      setTx(clamp(px - localX * newScale, -b.maxX, b.maxX));
      setTy(clamp(py - localY * newScale, -b.maxY, b.maxY));
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [getBounds]);

  // Desktop click handling: a single click (while not zoomed in) closes
  // the overlay — the whole non-zoomed view counts as "outside" until you
  // deliberately zoom in, at which point clicks are for panning instead.
  // A real double-click cancels the pending close and zooms in instead.
  // It's debounced rather than relying on onClick's e.detail so it stays
  // reliable even when a couple of these clicks are synthetic ones that
  // follow a touch gesture we've already handled ourselves.
  const handleClick = () => {
    if (scaleRef.current > 1.01) return;
    clearTimeout(clickTimeoutRef.current);
    clickTimeoutRef.current = setTimeout(dismissSimple, 260);
  };

  const handleDoubleClick = (e) => {
    clearTimeout(clickTimeoutRef.current);
    applyDoubleTap(e.clientX, e.clientY);
  };

  useEffect(() => () => clearTimeout(clickTimeoutRef.current), []);

  const transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale * dragScale})`;

  return (
    <div
      className="fixed inset-0 z-[100]"
      style={{
        backgroundColor: `rgba(0,0,0,${backdropOpacity})`,
        transition: springBack ? "background-color 0.28s ease" : "none",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        onClick={dismissSimple}
        aria-label="Close zoom"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform duration-150"
        style={{ opacity: backdropOpacity }}
      >
        <X size={18} strokeWidth={2.2} aria-hidden="true" />
      </button>

      {/* Carousel navigation buttons — only visible when not zoomed and there are multiple images */}
      {images.length > 1 && scale < 1.01 && (
        <>
          <button
            type="button"
            onClick={() => {
              const prev = (imageIndex - 1 + images.length) % images.length;
              onImageChange(prev);
            }}
            aria-label="Previous photo"
            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm items-center justify-center text-white active:scale-90 transition-transform duration-150 hover:bg-black/65"
            style={{ opacity: backdropOpacity * 0.8 }}
          >
            <ChevronLeft size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              const next = (imageIndex + 1) % images.length;
              onImageChange(next);
            }}
            aria-label="Next photo"
            className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/45 backdrop-blur-sm items-center justify-center text-white active:scale-90 transition-transform duration-150 hover:bg-black/65"
            style={{ opacity: backdropOpacity * 0.8 }}
          >
            <ChevronRight size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </>
      )}

      <div
        ref={containerRef}
        className="absolute inset-0 overflow-hidden select-none"
        style={{
          touchAction: "none",
          cursor: scale > 1.01 ? "grab" : "default",
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform,
            transformOrigin: "center center",
            transition: springBack
              ? "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)"
              : "none",
            willChange: "transform",
          }}
        >
          {/* Blurred instant placeholder — the display-tier image is
              already in the browser cache from the carousel, so this
              paints immediately with no network wait. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displaySrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              filter: "blur(18px)",
              transform: "scale(1.08)",
              opacity: zoomLoaded ? 0 : 1,
              transition: "opacity 0.25s ease",
            }}
            onLoad={(e) =>
              handleImageMeta(e.target.naturalWidth, e.target.naturalHeight)
            }
          />
          {/* Full-res zoom tier — fades in once it finishes loading. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomSrc}
            alt={alt}
            draggable={false}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              opacity: zoomLoaded ? 1 : 0,
              transition: "opacity 0.25s ease",
            }}
            onLoad={(e) => {
              setZoomLoaded(true);
              handleImageMeta(e.target.naturalWidth, e.target.naturalHeight);
            }}
          />
        </div>
      </div>
    </div>
  );
}
