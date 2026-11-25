import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Boxes,
  ClipboardList,
  Coins,
  Droplets,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Menu,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldAlert,
  ShoppingCart,
  Tag,
  Truck,
  UserCog,
  Users,
  X
} from "lucide-react";
import { apiFetch, getToken, setToken } from "./lib/api";
import { LandingPage } from "./components/LandingPage";
import { LoginView } from "./components/LoginView";
import { DeliveryReferencePortal } from "./components/DeliveryReferencePortal";
import { AccountSettingsView } from "./components/AccountSettingsView";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { SalesMonitoring } from "./components/admin/SalesMonitoring";
import { DeliveryAreasMap } from "./components/admin/DeliveryAreasMap";
import { ProductsManagement } from "./components/admin/ProductsManagement";
import { VendingMachinesManagement } from "./components/admin/VendingMachinesManagement";
import { StaffManagement } from "./components/admin/StaffManagement";
import { ReportsView } from "./components/admin/ReportsView";
import { ActivityLogsView } from "./components/admin/ActivityLogsView";
import { StaffOverview } from "./components/staff/StaffOverview";
import { SalesPOS } from "./components/staff/SalesPOS";
import { VendingSalesView } from "./components/staff/VendingSalesView";
import { OrdersPaymentsView } from "./components/staff/OrdersPaymentsView";
import { DeliveriesTrackingView } from "./components/staff/DeliveriesTrackingView";
import { CustomersView } from "./components/staff/CustomersView";
import { LocationMappingView } from "./components/staff/LocationMappingView";
import { ContainersView } from "./components/staff/ContainersView";
import { InventoryView } from "./components/staff/InventoryView";
import { SearchRecordsView } from "./components/staff/SearchRecordsView";
const ADMIN_NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sales-monitoring", label: "Sales Monitoring", icon: BarChart3 },
  { id: "delivery-areas", label: "Delivery Areas Map", icon: Map },
  { id: "inventory", label: "Inventory & Low Stock", icon: Boxes },
  { id: "products", label: "Products & Prices", icon: Tag },
  { id: "vending-machines", label: "Vending Machines", icon: Coins },
  { id: "staff-accounts", label: "Staff Accounts", icon: UserCog },
  { id: "reports", label: "Reports", icon: FileSpreadsheet },
  { id: "activity-logs", label: "Activity Logs", icon: Activity },
  { id: "account", label: "My Account", icon: Users }
];
const STAFF_NAV = [
  { id: "staff-home", label: "Operations Home", icon: LayoutDashboard },
  { id: "pos-sales", label: "Record Sale (POS)", icon: ShoppingCart },
  { id: "vending-sales", label: "Vending Sales", icon: Coins },
  { id: "orders-payments", label: "Orders & Payments", icon: ClipboardList },
  { id: "deliveries", label: "Deliveries & Tracking", icon: Truck },
  { id: "customers", label: "Customers & History", icon: Users },
  { id: "location-mapping", label: "Location Mapping", icon: MapPin },
  { id: "containers", label: "Containers", icon: PackageCheck },
  { id: "inventory", label: "Inventory & Stock", icon: Boxes },
  { id: "search", label: "Search Records", icon: Search },
  { id: "account", label: "My Account", icon: UserCog }
];
const ADMIN_ONLY_TABS = /* @__PURE__ */ new Set([
  "dashboard",
  "sales-monitoring",
  "delivery-areas",
  "products",
  "vending-machines",
  "staff-accounts",
  "reports",
  "activity-logs"
]);
const STAFF_ONLY_TABS = /* @__PURE__ */ new Set([
  "staff-home",
  "pos-sales",
  "vending-sales",
  "orders-payments",
  "deliveries",
  "customers",
  "location-mapping",
  "containers",
  "search"
]);
function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deliveryPortalMode, setDeliveryPortalMode] = useState(false);
  const [deliveryPortalToken, setDeliveryPortalToken] = useState(null);
  const [loginViewMode, setLoginViewMode] = useState(false);
  const [mapCustomerId, setMapCustomerId] = useState(null);
  const [selectedOrderCustomerId, setSelectedOrderCustomerId] = useState(null);
  const [selectedSaleCustomerId, setSelectedSaleCustomerId] = useState(null);
  const [selectedContainerCustomerId, setSelectedContainerCustomerId] = useState(null);
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash.startsWith("delivery-reference")) {
      const parts = hash.split("/");
      setDeliveryPortalToken(parts[1] || null);
      setDeliveryPortalMode(true);
      setLoginViewMode(false);
    } else if (hash === "login") {
      setDeliveryPortalMode(false);
      setLoginViewMode(true);
    } else if (hash) {
      setActiveTab(hash);
    }
    const onHashChange = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (h.startsWith("delivery-reference")) {
        const parts = h.split("/");
        setDeliveryPortalToken(parts[1] || null);
        setDeliveryPortalMode(true);
        setLoginViewMode(false);
      } else if (h === "login") {
        setDeliveryPortalMode(false);
        setLoginViewMode(true);
      } else if (h) {
        setDeliveryPortalMode(false);
        setLoginViewMode(false);
        setActiveTab(h);
      } else {
        setDeliveryPortalMode(false);
        setLoginViewMode(false);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
      setActiveTab("");
      setDeliveryPortalMode(false);
      setLoginViewMode(true);
      window.location.hash = "login";
    };
    window.addEventListener("aqua-fabz-unauthorized", onUnauthorized);
    return () => window.removeEventListener("aqua-fabz-unauthorized", onUnauthorized);
  }, []);
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthChecked(true);
      return;
    }
    apiFetch("/api/auth/me").then((res) => {
      setUser(res.user);
      setActiveTab(
        (prev) => prev || (res.user.role === "Administrator" ? "dashboard" : "staff-home")
      );
    }).catch(() => {
      setToken(null);
    }).finally(() => setAuthChecked(true));
  }, []);
  const navigate = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
    setMobileMenuOpen(false);
  };
  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    const defaultTab = loggedInUser.role === "Administrator" ? "dashboard" : "staff-home";
    setActiveTab(defaultTab);
    window.location.hash = defaultTab;
    setDeliveryPortalMode(false);
    setLoginViewMode(false);
  };
  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
    }
    setToken(null);
    setUser(null);
    setActiveTab("");
    setLoginViewMode(false);
    window.location.hash = "";
  };
  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading Aqua Fabz Management System...
      </div>;
  }
  if (deliveryPortalMode) {
    return <DeliveryReferencePortal
      initialToken={deliveryPortalToken}
      onBack={() => {
        setDeliveryPortalMode(false);
        setDeliveryPortalToken(null);
        window.location.hash = user ? activeTab : loginViewMode ? "login" : "";
      }}
      backLabel={user ? "Back to Workspace" : "Back to Home"}
    />;
  }
  if (!user) {
    if (loginViewMode) {
      return <LoginView
        onLoginSuccess={handleLoginSuccess}
        onOpenDeliveryPortal={() => {
          setDeliveryPortalToken(null);
          setDeliveryPortalMode(true);
          window.location.hash = "delivery-reference";
        }}
        onBackToLanding={() => {
          setLoginViewMode(false);
          window.location.hash = "";
        }}
      />;
    }
    return <LandingPage
      onOpenLogin={() => {
        setLoginViewMode(true);
        window.location.hash = "login";
        window.scrollTo({ top: 0 });
      }}
      onOpenDeliveryPortal={() => {
        setDeliveryPortalToken(null);
        setDeliveryPortalMode(true);
        window.location.hash = "delivery-reference";
      }}
    />;
  }
  const navItems = user.role === "Administrator" ? ADMIN_NAV : STAFF_NAV;
  const currentTab = activeTab || (user.role === "Administrator" ? "dashboard" : "staff-home");
  const currentNavLabel = navItems.find((n) => n.id === currentTab)?.label || "Access Restricted";
  const isStaffBlockedFromAdmin = user.role === "Staff" && ADMIN_ONLY_TABS.has(currentTab);
  const isAdminBlockedFromStaff = user.role === "Administrator" && STAFF_ONLY_TABS.has(currentTab);
  const renderMainContent = () => {
    if (isStaffBlockedFromAdmin) {
      return <div className="rounded-xl border border-red-200 bg-white p-8 max-w-lg mx-auto my-10 text-center space-y-4">
          <ShieldAlert className="h-10 w-10 text-red-600 mx-auto" />
          <h2 className="font-display text-lg font-bold text-slate-900">
            Access Denied — Administrator Only
          </h2>
          <p className="text-sm text-slate-600">
            This module is restricted to the Station Administrator. Staff accounts can access operational modules from the sidebar menu.
          </p>
          <button
        type="button"
        onClick={() => navigate("staff-home")}
        className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
      >
            Return to Staff Operations
          </button>
        </div>;
    }
    if (isAdminBlockedFromStaff) {
      return <div className="rounded-xl border border-amber-200 bg-white p-8 max-w-lg mx-auto my-10 text-center space-y-4">
          <ShieldAlert className="h-10 w-10 text-amber-600 mx-auto" />
          <h2 className="font-display text-lg font-bold text-slate-900">
            Staff Operational Module
          </h2>
          <p className="text-sm text-slate-600">
            Daily counter sales, customer profiles, orders, and deliveries are performed by Staff accounts. As Administrator, you can monitor these through Dashboard, Sales Monitoring, Delivery Areas Map, Reports, and Activity Logs.
          </p>
          <button
        type="button"
        onClick={() => navigate("dashboard")}
        className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
      >
            Return to Dashboard
          </button>
        </div>;
    }
    switch (currentTab) {
      case "dashboard":
        return <AdminDashboard onNavigate={navigate} />;
      case "sales-monitoring":
        return <SalesMonitoring />;
      case "delivery-areas":
        return <DeliveryAreasMap />;
      case "products":
        return <ProductsManagement />;
      case "vending-machines":
        return <VendingMachinesManagement />;
      case "staff-accounts":
        return <StaffManagement />;
      case "reports":
        return <ReportsView />;
      case "activity-logs":
        return <ActivityLogsView />;
      case "staff-home":
        return <StaffOverview onNavigate={navigate} />;
      case "pos-sales":
        return <SalesPOS initialCustomerId={selectedSaleCustomerId} />;
      case "vending-sales":
        return <VendingSalesView />;
      case "orders-payments":
        return <OrdersPaymentsView initialCustomerId={selectedOrderCustomerId} />;
      case "deliveries":
        return <DeliveriesTrackingView
          onOpenDeliveryReference={(token) => {
            setDeliveryPortalToken(token || null);
            setDeliveryPortalMode(true);
            window.location.hash = token ? `delivery-reference/${token}` : "delivery-reference";
          }}
        />;
      case "customers":
        return <CustomersView
          onOpenLocationMapping={(cid) => {
            setMapCustomerId(cid);
            navigate("location-mapping");
          }}
          onOpenNewOrder={(c) => {
            setSelectedOrderCustomerId(c.id);
            navigate("orders-payments");
          }}
          onOpenNewSale={(c) => {
            setSelectedSaleCustomerId(c.id);
            navigate("pos-sales");
          }}
          onOpenContainers={(c) => {
            setSelectedContainerCustomerId(c.id);
            navigate("containers");
          }}
        />;
      case "location-mapping":
        return <LocationMappingView initialCustomerId={mapCustomerId} />;
      case "containers":
        return <ContainersView initialCustomerId={selectedContainerCustomerId} />;
      case "inventory":
        return <InventoryView canEdit={user.role === "Staff"} />;
      case "search":
        return <SearchRecordsView />;
      case "account":
        return <AccountSettingsView user={user} onUserUpdated={setUser} />;
      default:
        return user.role === "Administrator" ? <AdminDashboard onNavigate={navigate} /> : <StaffOverview onNavigate={navigate} />;
    }
  };
  return <div className="min-h-screen bg-slate-50 flex">
      {
    /* Desktop Sidebar */
  }
      <aside className={`no-print hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-30 bg-slate-900 text-slate-200 border-r border-slate-800 transition-[width] duration-200 ${sidebarOpen ? "lg:w-64" : "lg:w-[72px]"}`}>
        <div className={`flex items-center border-b border-slate-800 ${sidebarOpen ? "justify-between gap-2 px-5 py-5" : "justify-center px-3 py-5"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
    type="button"
    onClick={() => !sidebarOpen && setSidebarOpen(true)}
    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white ${!sidebarOpen ? "hover:bg-sky-500 cursor-pointer" : "cursor-default"}`}
    title={sidebarOpen ? "Aqua Fabz Station" : "Expand sidebar"}
    aria-label={sidebarOpen ? "Aqua Fabz Station" : "Expand sidebar"}
  >
              <Droplets className="h-5 w-5" />
            </button>
            {sidebarOpen && <div className="min-w-0">
              <div className="font-display text-sm font-bold text-white truncate">
                Aqua Fabz Station
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {user.role} Workspace
              </div>
            </div>}
          </div>
          {sidebarOpen && <button
    type="button"
    onClick={() => setSidebarOpen(false)}
    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white shrink-0"
    title="Collapse sidebar to icons"
    aria-label="Collapse sidebar to icons"
  >
            <PanelLeftClose className="h-4 w-4" />
          </button>}
        </div>

        <nav className={`sidebar-scroll flex-1 overflow-y-auto py-4 space-y-1 ${sidebarOpen ? "px-3" : "px-2.5"}`}>
          {navItems.map((item) => {
    const Icon = item.icon;
    const active = currentTab === item.id;
    return <button
      key={item.id}
      type="button"
      onClick={() => navigate(item.id)}
      title={item.label}
      aria-label={item.label}
      className={`w-full flex items-center rounded-lg py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${sidebarOpen ? "gap-3 px-3" : "justify-center px-0"} ${active ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
    >
                <Icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>;
  })}
        </nav>

        <div className={`border-t border-slate-800 space-y-3 ${sidebarOpen ? "p-4" : "p-2.5"}`}>
          {sidebarOpen && <div className="text-xs">
            <div className="font-semibold text-white truncate">{user.name}</div>
            <div className="text-[11px] text-slate-400 font-mono truncate">
              @{user.username} · {user.role}
            </div>
          </div>}
          <button
    type="button"
    onClick={handleLogout}
    title="Log Out"
    aria-label="Log Out"
    className={`w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/70 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 ${sidebarOpen ? "px-3" : "px-0"}`}
  >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {sidebarOpen && "Log Out"}
          </button>
        </div>
      </aside>

      {
    /* Mobile Drawer */
  }
      {mobileMenuOpen && <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
    className="fixed inset-0 bg-slate-900/60"
    onClick={() => setMobileMenuOpen(false)}
  />
          <aside className="relative z-10 w-64 bg-slate-900 text-slate-200 flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <span className="font-display text-sm font-bold text-white">
                Aqua Fabz Station
              </span>
              <button
    type="button"
    onClick={() => setMobileMenuOpen(false)}
    className="p-1 text-slate-400 hover:text-white"
  >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {navItems.map((item) => {
    const Icon = item.icon;
    const active = currentTab === item.id;
    return <button
      key={item.id}
      type="button"
      onClick={() => navigate(item.id)}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium ${active ? "bg-sky-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}
    >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>;
  })}
            </nav>
            <div className="border-t border-slate-800 p-4">
              <button
    type="button"
    onClick={handleLogout}
    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200"
  >
                <LogOut className="h-3.5 w-3.5" /> Log Out
              </button>
            </div>
          </aside>
        </div>}

      {
    /* Main Content Shell */
  }
      <div className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-200 ${sidebarOpen ? "lg:pl-64" : "lg:pl-[72px]"}`}>
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
    type="button"
    onClick={() => setSidebarOpen((open) => !open)}
    className="hidden lg:inline-flex rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    title={sidebarOpen ? "Collapse sidebar to icons" : "Expand sidebar labels"}
    aria-label={sidebarOpen ? "Collapse sidebar to icons" : "Expand sidebar labels"}
  >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            <button
    type="button"
    onClick={() => setMobileMenuOpen(true)}
    className="lg:hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
    aria-label="Open navigation menu"
  >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="font-medium text-slate-700">Aqua Fabz</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">
                {currentNavLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user.role === "Staff" && <button
    type="button"
    onClick={() => {
      setDeliveryPortalToken(null);
      setDeliveryPortalMode(true);
      window.location.hash = "delivery-reference";
    }}
    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
  >
                Driver Reference Sheet
              </button>}
            <button
    type="button"
    onClick={() => navigate("account")}
    className="text-xs font-medium text-slate-700 hover:text-slate-900 whitespace-nowrap"
  >
              {user.name}
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderMainContent()}
        </main>
      </div>
    </div>;
}
export {
  App as default
};
