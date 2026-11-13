"use client";

import { type Driver, type DriveStep, driver } from "driver.js";
import "driver.js/dist/driver.css";
// Must import after driver.css — see tour-theme.css's own header comment.
import "./tour-theme.css";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { ROLES } from "@/lib/roles";
import { FindTourElement } from "./tour-elements";
import {
  INVENTORY_TOUR_STEPS,
  MANAGER_TOUR_STEPS,
  type TourStepDef,
  VisibleTourSteps,
} from "./tour-steps";

type AppRouter = ReturnType<typeof useRouter>;

// A step whose element lives on one specific page (the per-role action
// buttons) needs client-side navigation before driver.js can find it.
// Each step's onNextClick/onPrevClick (driver.js also routes arrow-key
// navigation through these, not just the footer buttons) pushes the
// *target* step's route first, then lets driver.js's own waitForElement/
// MutationObserver machinery do what it already does for a slow-to-mount
// element — no polling of our own needed.
function BuildDriveSteps(defs: TourStepDef[], router: AppRouter): DriveStep[] {
  return defs.map((def, index) => {
    const step: DriveStep = {
      // driver.js's own runtime checks this for undefined (an element that
      // hasn't mounted yet) despite its `.d.ts` claiming a bare `Element` —
      // the cast below just matches what the library actually accepts.
      element: () => FindTourElement(def.id) as Element,
      popover: {
        title: def.title,
        description: def.description,
        onNextClick: (_element, _driveStep, opts) => {
          const next = defs[index + 1];
          if (next?.route && window.location.pathname !== next.route) {
            router.push(next.route);
          }
          opts.driver.moveNext();
        },
        onPrevClick: (_element, _driveStep, opts) => {
          const prev = defs[index - 1];
          if (prev?.route && window.location.pathname !== prev.route) {
            router.push(prev.route);
          }
          opts.driver.movePrevious();
        },
      },
    };

    // Give driver.js room to wait out a client-side navigation + mount
    // before concluding the element is actually missing.
    if (def.route) {
      step.waitForElement = 4000;
    }

    return step;
  });
}

export function useProductTour(role: string | null, permissions: string[]) {
  const router = useRouter();
  const driverRef = useRef<Driver | null>(null);

  return useCallback(() => {
    const steps =
      role === ROLES.MANAGER
        ? MANAGER_TOUR_STEPS
        : role === ROLES.INVENTORY_MANAGER
          ? INVENTORY_TOUR_STEPS
          : null;
    if (!steps) return;
    const visibleSteps = VisibleTourSteps(steps, permissions);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    driverRef.current?.destroy();
    driverRef.current = driver({
      steps: BuildDriveSteps(visibleSteps, router),
      animate: !reducedMotion,
      duration: 250,
      smoothScroll: !reducedMotion,
      overlayColor: "#000",
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 10,
      progressText: "{{current}} of {{total}}",
      showProgress: true,
    });
    driverRef.current.drive();
  }, [role, permissions, router]);
}
