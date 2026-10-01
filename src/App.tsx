/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Multi-Divisional Application Root - PT Aetra Air Tangerang
 */

import { useEffect, useRef, useState } from "react";
import { initMinorRepairApp } from "./minorRepairApp";
import { initMobileOfficerApp } from "./mobileApp";
import { renderPortalLogin } from "./auth/portalLogin";
import { createDivisionHeader } from "./components/divisionHeader";
import { renderCustomerServiceDashboard } from "./dashboards/customerServiceDashboard";
import { renderSalesSupportDashboard } from "./dashboards/salesSupportDashboard";
import { renderKeyAccountDashboard } from "./dashboards/keyAccountDashboard";
import { renderTechnicalSupportDashboard } from "./dashboards/technicalSupportDashboard";
import {
  getActiveDivisionSession,
  setActiveDivisionSession,
  clearActiveDivisionSession,
} from "./services/divisionTicketService";
import { startBackgroundRolloverScheduler } from "./services/backgroundRolloverScheduler";
import { DivisionId, DivisionUserSession, DIVISIONS } from "./types/division";
import { DIVISION_ACCOUNTS } from "./auth/divisionAuthService";
import { initWorkOrderToastListener } from "./components/workOrderNotificationToast";
import { createWorkOrderNotificationBanner } from "./components/workOrderNotificationBanner";

import { renderCustomerWorkOrderSummaryView } from "./components/customerWorkOrderSummaryView";
import { renderCustomerLiveTrackingView } from "./components/customerLiveTrackingView";
import { renderCustomerSelfServiceComplaintView } from "./components/customerSelfServiceComplaintView";

interface CustomerRoute {
  type: "track" | "summary" | "rating" | "lapor";
  ticketId?: string;
}

function getCustomerRoute(): CustomerRoute | null {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const woParam =
    searchParams.get("wo") ||
    searchParams.get("id") ||
    searchParams.get("ticket") ||
    searchParams.get("case") ||
    searchParams.get("no");
  const viewParam = searchParams.get("view") || searchParams.get("mode");
  const trackParam = searchParams.get("track") || searchParams.get("lacak");
  const ratingParam = searchParams.get("rating") || searchParams.get("nilai") || searchParams.get("csat");
  const summaryParam = searchParams.get("summary") || searchParams.get("ringkasan") || searchParams.get("bast");
  const laporParam = searchParams.get("lapor") || searchParams.get("pengaduan");

  // 0. Explicit Customer Self-Service Complaint Portal detection
  if (
    viewParam === "lapor" ||
    viewParam === "pengaduan" ||
    viewParam === "portal-lapor" ||
    viewParam === "complaint" ||
    laporParam ||
    window.location.search.includes("view=lapor") ||
    window.location.search.includes("view=pengaduan") ||
    window.location.hash.includes("lapor") ||
    window.location.hash.includes("pengaduan")
  ) {
    return { type: "lapor" };
  }

  // 1. Explicit Rating Link detection
  if (
    viewParam === "rating" ||
    viewParam === "nilai" ||
    viewParam === "csat" ||
    ratingParam ||
    window.location.search.includes("view=rating") ||
    window.location.hash.includes("rating") ||
    window.location.hash.includes("nilai")
  ) {
    const rawTarget = ratingParam && ratingParam !== "true" ? ratingParam : woParam;
    return { type: "rating", ticketId: rawTarget || "WO-2026-001" };
  }

  // 2. Explicit Live Track Link detection
  if (
    viewParam === "track" ||
    viewParam === "lacak" ||
    trackParam ||
    window.location.search.includes("view=track") ||
    window.location.hash.includes("track")
  ) {
    const rawTarget = trackParam && trackParam !== "true" ? trackParam : woParam;
    return { type: "track", ticketId: rawTarget || "WO-2026-001" };
  }

  // 3. Explicit Summary / BAST Link detection
  if (
    viewParam === "summary" ||
    viewParam === "ringkasan" ||
    viewParam === "bast" ||
    summaryParam ||
    woParam ||
    window.location.search.includes("view=summary") ||
    window.location.hash.includes("summary")
  ) {
    const rawTarget = summaryParam && summaryParam !== "true" ? summaryParam : woParam;
    return { type: "summary", ticketId: rawTarget || "WO-2026-001" };
  }

  return null;
}

export default function App() {
  const rootRef = useRef<HTMLDivElement>(null);

  const [customerRoute, setCustomerRoute] = useState<CustomerRoute | null>(() => getCustomerRoute());

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // CRITICAL: If customer route (rating/track/summary) is present, NEVER open mobile officer app!
    if (getCustomerRoute() !== null) return false;
    return (
      window.location.pathname.includes("mobile") ||
      window.location.pathname.includes("petugas") ||
      window.location.search.includes("mode=mobile") ||
      window.location.search.includes("mode=phone") ||
      window.location.hash === "#mobile" ||
      window.location.hash === "#handphone"
    );
  });

  const [session, setSession] = useState<DivisionUserSession | null>(() => {
    return getActiveDivisionSession();
  });

  // Listen to route changes
  useEffect(() => {
    const checkRoute = () => {
      const cRoute = getCustomerRoute();
      setCustomerRoute(cRoute);
      if (cRoute !== null) {
        setIsMobile(false);
        return;
      }
      const mobileActive =
        window.location.pathname.includes("mobile") ||
        window.location.pathname.includes("petugas") ||
        window.location.search.includes("mode=mobile") ||
        window.location.search.includes("mode=phone") ||
        window.location.hash === "#mobile" ||
        window.location.hash === "#handphone";
      setIsMobile(mobileActive);
    };

    window.addEventListener("hashchange", checkRoute);
    window.addEventListener("popstate", checkRoute);

    // Start recurring background task to identify and rollover pending work orders
    const stopDaemon = startBackgroundRolloverScheduler(45000);

    return () => {
      window.removeEventListener("hashchange", checkRoute);
      window.removeEventListener("popstate", checkRoute);
      stopDaemon();
    };
  }, []);

  // Main UI Lifecycle
  useEffect(() => {
    const container = rootRef.current;
    if (!container) return;
    container.innerHTML = "";

    // 0. Public Customer Work Order Summary & Officer Rating View (TOP PRIORITY)
    const activeCustomerRoute = customerRoute || getCustomerRoute();
    if (activeCustomerRoute && (activeCustomerRoute.type === "rating" || activeCustomerRoute.type === "summary")) {
      container.className = "customer-summary-mode";
      const cleanup = renderCustomerWorkOrderSummaryView(
        container,
        activeCustomerRoute.ticketId || "WO-2026-001",
        activeCustomerRoute.type
      );
      return () => {
        cleanup();
      };
    }

    // 0. Public Customer Live Tracking & Presence Confirmation View
    if (activeCustomerRoute && activeCustomerRoute.type === "track") {
      container.className = "customer-track-mode";
      const cleanup = renderCustomerLiveTrackingView(container, activeCustomerRoute.ticketId || "WO-2026-001");
      return () => {
        cleanup();
      };
    }

    // 0. Public Customer Self-Service Complaint Portal View
    if (activeCustomerRoute && activeCustomerRoute.type === "lapor") {
      container.className = "customer-lapor-mode";
      const cleanup = renderCustomerSelfServiceComplaintView(container);
      return () => {
        cleanup();
      };
    }

    // 1. Mobile Officer View
    if (isMobile) {
      container.className = "";
      const cleanup = initMobileOfficerApp(container);
      return () => {
        cleanup();
      };
    }

    // 2. Multi-Division Portal Login Screen (if not logged in)
    if (!session) {
      container.className = "portal-mode";
      const loginView = renderPortalLogin({
        onLoginSuccess: (newSession) => {
          setActiveDivisionSession(newSession);
          setSession(newSession);
        },
      });
      container.appendChild(loginView);
      return () => {
        container.innerHTML = "";
      };
    }

    // 3. Authenticated Multi-Division Dashboard
    container.className = "division-mode";

    let cleanupDashboard: (() => void) | null = null;

    // Initialize floating toast notification system
    const cleanupToast = initWorkOrderToastListener();

    const switchDivision = (
      targetDivision: DivisionId,
      authorizedSession?: DivisionUserSession
    ) => {
      if (authorizedSession) {
        setActiveDivisionSession(authorizedSession);
        setSession(authorizedSession);
      } else {
        const acc = DIVISION_ACCOUNTS[targetDivision];
        const updatedSession: DivisionUserSession = {
          divisionId: targetDivision,
          name: acc ? acc.officerName : DIVISIONS[targetDivision].defaultAdminName,
          email: acc ? acc.email : DIVISIONS[targetDivision].defaultAdminEmail,
          role: "admin",
          loginAt: new Date().toISOString(),
          username: acc ? acc.displayUsername : undefined,
        };
        setActiveDivisionSession(updatedSession);
        setSession(updatedSession);
      }
    };

    const header = createDivisionHeader({
      currentDivision: session.divisionId,
      session,
      onSwitchDivision: switchDivision,
      onLogout: () => {
        clearActiveDivisionSession();
        setSession(null);
      },
      onRefresh: () => {
        // Trigger re-mount
        setSession({ ...session });
      },
    });

    container.appendChild(header);

    // Mount real-time alert banner right below header
    const banner = createWorkOrderNotificationBanner({
      currentDivision: session.divisionId,
      onSwitchDivision: (target) => switchDivision(target),
    });
    container.appendChild(banner.element);

    const mainContentEl = document.createElement("main");
    mainContentEl.className = "division-main-content";
    mainContentEl.style.cssText = "flex: 1; display: flex; flex-direction: column; width: 100%; box-sizing: border-box;";
    container.appendChild(mainContentEl);

    // Global listener for division switch requests (from toast or banner)
    const handleDivisionSwitchRequest = (e: any) => {
      if (e.detail?.divisionId) {
        switchDivision(e.detail.divisionId);
      }
    };
    window.addEventListener("aetra:switch_division_requested", handleDivisionSwitchRequest);

    // Mount specific division dashboard
    if (session.divisionId === "customer_service") {
      cleanupDashboard = renderCustomerServiceDashboard(mainContentEl);
    } else if (session.divisionId === "minor_repair") {
      cleanupDashboard = initMinorRepairApp(mainContentEl);
    } else if (session.divisionId === "sales_support") {
      cleanupDashboard = renderSalesSupportDashboard(mainContentEl);
    } else if (session.divisionId === "key_account") {
      cleanupDashboard = renderKeyAccountDashboard(mainContentEl);
    } else if (session.divisionId === "technical_support") {
      cleanupDashboard = renderTechnicalSupportDashboard(mainContentEl);
    }

    return () => {
      window.removeEventListener("aetra:switch_division_requested", handleDivisionSwitchRequest);
      cleanupToast();
      banner.cleanup();
      if (cleanupDashboard) {
        cleanupDashboard();
      }
      container.innerHTML = "";
    };
  }, [isMobile, session, customerRoute]);

  return <div id="app-root" ref={rootRef} />;
}
