import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Buildings,
  MagnifyingGlass,
  X,
  Users,
  Star,
  Funnel,
  ShieldCheck,
  ShieldWarning,
} from "@phosphor-icons/react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { staggerContainer, staggerItem, SPRING, SPRING_GENTLE } from "@/shared/utils/motion";
import NotificationsBell from "@/shared/components/NotificationsBell";
import WorkerFilterSheet, {
  EMPTY_FILTERS,
  countActiveFilters,
} from "../components/WorkerFilterSheet";
import type { WorkerFilters } from "../components/WorkerFilterSheet";
import { DISPLAY_TIMES } from "@/shared/constants/timeSlots";
import type { WorkerShift } from "@/shared/types/worker.types";
import type { WorkingDayId } from "@/shared/constants/timeSlots";
import { SERVICE_TYPES } from "@/shared/constants/serviceTypes";
import { fetchWorkersForResident } from "../services/residentPortalService";
import type { ResidentWorker } from "../services/residentPortalService";
import { useResidentStore } from "../stores/residentStore";
import { useAuthStore } from "@/shared/stores/authStore";
import { supabase } from "@/lib/supabase";
import BookingModal from "../components/BookingModal";
import WorkerDetailModal from "../components/WorkerDetailModal";
import EmptyState from "@/shared/components/EmptyState";
import LoadingSpinner from "@/shared/components/LoadingSpinner";

const SERVICE_LABELS: Record<string, string> = {
  maid: "Maid",
  jhadu_pocha: "Jhadu Pocha",
  bartan: "Bartan",
  cooking: "Cooking",
  car_cleaning: "Car Cleaning",
  laundry: "Laundry",
  child_care: "Child Care",
  elder_care: "Elder Care",
  deep_cleaning: "Deep Cleaning",
  full_time: "Full Time",
};

const SERVICE_COLORS: Record<
  string,
  { icon: string; bg: string; activeBg: string }
> = {
  maid:          { icon: "text-purple-600", bg: "bg-purple-50",  activeBg: "bg-purple-600" },
  jhadu_pocha:   { icon: "text-blue-600",   bg: "bg-blue-50",    activeBg: "bg-blue-600" },
  bartan:        { icon: "text-teal-600",   bg: "bg-teal-50",    activeBg: "bg-teal-600" },
  cooking:       { icon: "text-orange-600", bg: "bg-orange-50",  activeBg: "bg-orange-600" },
  car_cleaning:  { icon: "text-slate-600",  bg: "bg-slate-100",  activeBg: "bg-slate-600" },
  laundry:       { icon: "text-sky-600",    bg: "bg-sky-50",     activeBg: "bg-sky-600" },
  child_care:    { icon: "text-pink-600",   bg: "bg-pink-50",    activeBg: "bg-pink-600" },
  elder_care:    { icon: "text-rose-600",   bg: "bg-rose-50",    activeBg: "bg-rose-600" },
  deep_cleaning: { icon: "text-green-600",  bg: "bg-green-50",   activeBg: "bg-green-600" },
  full_time:     { icon: "text-indigo-600", bg: "bg-indigo-50",  activeBg: "bg-indigo-600" },
};

const SERVICE_PILL_COLORS: Record<string, string> = {
  maid:          "bg-purple-100 text-purple-700",
  jhadu_pocha:   "bg-blue-100 text-blue-700",
  bartan:        "bg-teal-100 text-teal-700",
  cooking:       "bg-orange-100 text-orange-700",
  car_cleaning:  "bg-slate-100 text-slate-700",
  laundry:       "bg-sky-100 text-sky-700",
  child_care:    "bg-pink-100 text-pink-700",
  elder_care:    "bg-rose-100 text-rose-700",
  deep_cleaning: "bg-green-100 text-green-700",
  full_time:     "bg-indigo-100 text-indigo-700",
};

const DAY_INITIALS: { id: WorkingDayId; label: string }[] = [
  { id: "mon", label: "M" },
  { id: "tue", label: "T" },
  { id: "wed", label: "W" },
  { id: "thu", label: "T" },
  { id: "fri", label: "F" },
  { id: "sat", label: "S" },
  { id: "sun", label: "S" },
];

function formatShift(s: WorkerShift) {
  return `${DISPLAY_TIMES[s.start] ?? s.start} – ${DISPLAY_TIMES[s.end] ?? s.end}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function ResidentHomePage() {
  const { user } = useAuthStore();
  const { resident } = useResidentStore();
  const navigate = useNavigate();
  const chipScrollRef = useRef<HTMLDivElement>(null);

  const [societyName, setSocietyName] = useState("");
  const [allWorkers, setAllWorkers] = useState<ResidentWorker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detailWorker, setDetailWorker] = useState<ResidentWorker | null>(null);
  const [bookingWorker, setBookingWorker] = useState<ResidentWorker | null>(null);
  const [filters, setFilters] = useState<WorkerFilters>(EMPTY_FILTERS);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const activeFilterCount = countActiveFilters(filters);

  useEffect(() => {
    if (!resident) return;
    async function load() {
      try {
        const [societyRes, workers] = await Promise.all([
          supabase
            .from("societies")
            .select("name")
            .eq("id", resident!.society_id)
            .maybeSingle(),
          fetchWorkersForResident(resident!.society_id),
        ]);
        if (societyRes.data) setSocietyName(societyRes.data.name);
        setAllWorkers(workers);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [resident]);

  function selectCategory(id: string | null) {
    setActiveCategory(id);
    setSearchQuery("");
    if (id && chipScrollRef.current) {
      const btn = chipScrollRef.current.querySelector(
        `[data-id="${id}"]`,
      ) as HTMLElement | null;
      btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  const workers = allWorkers.filter((w) => {
    const matchesCategory = !activeCategory || w.pricing.some((p) => p.serviceTypeId === activeCategory);
    if (!matchesCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = w.name.toLowerCase().includes(q);
      const serviceMatch = w.pricing.some((p) =>
        (SERVICE_LABELS[p.serviceTypeId] ?? p.serviceTypeId).toLowerCase().includes(q),
      );
      if (!nameMatch && !serviceMatch) return false;
    }
    if (filters.services.length) {
      if (!w.pricing.some((p) => filters.services.includes(p.serviceTypeId))) return false;
    }
    if (filters.gender && w.gender !== filters.gender) return false;
    if (filters.onlyAvailable && !w.isAvailable) return false;
    if (filters.workingDays.length && !filters.workingDays.every((d) => w.workingDays.includes(d))) return false;
    if (filters.timeStart || filters.timeEnd) {
      const start = filters.timeStart ?? "00:00";
      const end = filters.timeEnd ?? "23:59";
      if (!w.shifts.some((s) => s.start <= start && s.end >= end)) return false;
    }
    if (filters.pricingMode) {
      if (!w.pricing.some((p) => filters.pricingMode === "monthly" ? p.monthlyRate > 0 : p.perVisitRate > 0)) return false;
    }
    if (filters.priceMin !== null || filters.priceMax !== null) {
      const rateOf = (p: (typeof w.pricing)[number]) =>
        filters.pricingMode === "per_visit" ? p.perVisitRate : p.monthlyRate;
      const candidatePrices = w.pricing.map(rateOf).filter((n) => n > 0);
      if (candidatePrices.length === 0) return false;
      const min = filters.priceMin ?? 0;
      const max = filters.priceMax ?? Number.POSITIVE_INFINITY;
      if (!candidatePrices.some((p) => p >= min && p <= max)) return false;
    }
    return true;
  });

  const displayName = user?.name?.split(" ")[0] ?? "there";
  const initial = (user?.name ?? "U")[0].toUpperCase();

  // Key to re-trigger stagger when filter/search changes
  const listKey = `${activeCategory ?? "all"}-${searchQuery}-${activeFilterCount}`;

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Gradient header ──────────────────────────────────────────── */}
      <motion.div
        className="bg-gradient-to-br from-primary to-[#2a4f7a] px-5 pt-12 pb-6 rounded-b-3xl"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
      >
        <div className="flex items-center justify-between mb-3">
          <motion.div
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 24, delay: 0.1 }}
          >
            <span className="text-white font-heading font-bold text-base">{initial}</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.12 }}
          >
            <NotificationsBell variant="light" />
          </motion.div>
        </div>

        <motion.p
          className="font-body text-white/70 text-sm"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...SPRING, delay: 0.15 }}
        >
          {getGreeting()},
        </motion.p>
        <motion.h1
          className="font-heading font-bold text-xl text-white mb-3"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...SPRING, delay: 0.18 }}
        >
          {displayName} 👋
        </motion.h1>

        {societyName && (
          <motion.div
            className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 26, delay: 0.22 }}
          >
            <Buildings size={14} weight="duotone" className="text-white/90" />
            <span className="font-body text-white/90 text-xs font-medium">{societyName}</span>
          </motion.div>
        )}
      </motion.div>

      {/* ── Search bar (overlapping header) ─────────────────────────── */}
      <motion.div
        className="mx-4 -mt-5 mb-4 flex items-center gap-2"
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 28, delay: 0.25 }}
      >
        <div className="flex-1 bg-white rounded-2xl shadow-card border border-gray-100 flex items-center gap-3 px-4 py-3.5">
          <MagnifyingGlass size={18} weight="regular" className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeCategory) setActiveCategory(null);
            }}
            placeholder="Search workers or services…"
            className="flex-1 min-w-0 font-body text-sm text-gray-700 placeholder:text-gray-400 bg-transparent outline-none"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                onClick={() => setSearchQuery("")}
                className="shrink-0"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={SPRING}
              >
                <X size={16} weight="bold" className="text-gray-400" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <motion.button
          onClick={() => setShowFilterSheet(true)}
          className={`relative shrink-0 w-12 h-12 rounded-2xl shadow-card border flex items-center justify-center transition-colors ${
            activeFilterCount > 0 ? "bg-primary border-primary" : "bg-white border-gray-100"
          }`}
          whileTap={{ scale: 0.88 }}
          transition={SPRING}
          aria-label="Filters"
        >
          <Funnel
            size={18}
            weight={activeFilterCount > 0 ? "fill" : "regular"}
            className={activeFilterCount > 0 ? "text-white" : "text-gray-500"}
          />
          <AnimatePresence>
            {activeFilterCount > 0 && (
              <motion.span
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={SPRING}
              >
                {activeFilterCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* ── Service icon filter row ──────────────────────────────────── */}
      <LayoutGroup id="category-chips">
        <motion.div
          ref={chipScrollRef}
          className="flex gap-3 px-4 mb-5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_GENTLE, delay: 0.3 }}
        >
          {/* All */}
          <button
            onClick={() => selectCategory(null)}
            className="flex flex-col items-center gap-1.5 flex-none"
          >
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center">
              {!activeCategory && (
                <motion.span
                  layoutId="cat-pill"
                  className="absolute inset-0 bg-primary rounded-2xl"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Users
                size={30}
                weight="duotone"
                className={`relative z-10 ${!activeCategory ? "text-white" : "text-gray-500"}`}
              />
              {activeCategory !== null && (
                <div className="absolute inset-0 bg-gray-100 rounded-2xl -z-10" />
              )}
            </div>
            <span className={`font-body text-[10px] font-semibold ${!activeCategory ? "text-primary" : "text-gray-500"}`}>
              All
            </span>
          </button>

          {SERVICE_TYPES.map((s) => {
            const isActive = activeCategory === s.id;
            const colors = SERVICE_COLORS[s.id] ?? { icon: "text-gray-500", bg: "bg-gray-100", activeBg: "bg-gray-600" };
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                data-id={s.id}
                onClick={() => selectCategory(isActive ? null : s.id)}
                className="flex flex-col items-center gap-1.5 flex-none"
              >
                <div className={`relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center ${!isActive ? colors.bg : ""}`}>
                  {isActive && (
                    <motion.span
                      layoutId="cat-pill"
                      className={`absolute inset-0 ${colors.activeBg} rounded-2xl`}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    />
                  )}
                  <Icon
                    size={30}
                    weight="duotone"
                    className={`relative z-10 ${isActive ? "text-white" : colors.icon}`}
                  />
                </div>
                <span className={`font-body text-[10px] font-semibold text-center leading-tight max-w-[56px] ${isActive ? "text-primary" : "text-gray-500"}`}>
                  {SERVICE_LABELS[s.id]}
                </span>
              </button>
            );
          })}
        </motion.div>
      </LayoutGroup>

      {/* ── Workers list ─────────────────────────────────────────────── */}
      <div className="px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-gray-800 text-base">
            {activeCategory
              ? `${SERVICE_LABELS[activeCategory] ?? activeCategory} Workers`
              : searchQuery
                ? `Results for "${searchQuery}"`
                : "Workers in your society"}
          </h2>
          {!isLoading && (
            <span className="font-body text-xs text-gray-400">{workers.length} found</span>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : workers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              searchQuery ? `No results for "${searchQuery}"` :
              activeCategory ? `No ${SERVICE_LABELS[activeCategory] ?? activeCategory} workers` :
              "No workers yet"
            }
            description={
              searchQuery || activeCategory
                ? "Try a different search or filter."
                : "Verified workers will appear here once they register."
            }
          />
        ) : (
          <motion.div
            key={listKey}
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {workers.map((worker) => {
              const minMonthly = worker.pricing.length > 0
                ? Math.min(...worker.pricing.map((p) => p.monthlyRate))
                : null;

              return (
                <motion.div
                  key={worker.userId}
                  variants={staggerItem}
                  className="bg-white rounded-2xl shadow-card overflow-hidden cursor-pointer"
                  whileTap={{ scale: 0.985 }}
                  transition={SPRING}
                  onClick={() => setDetailWorker(worker)}
                >
                  {/* Header: avatar + identity + price */}
                  <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                    <div className="relative shrink-0">
                      {worker.photoUrl ? (
                        <img
                          src={worker.photoUrl}
                          alt={worker.name}
                          className="w-14 h-14 rounded-2xl object-cover ring-1 ring-gray-100"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                          <span className="font-heading font-bold text-primary text-lg">
                            {worker.name[0]?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                      )}
                      {worker.isAvailable && (
                        <motion.span
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.15 }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-heading font-bold text-gray-900 text-[15px] leading-tight truncate">
                          {worker.name}
                        </h3>
                        {minMonthly !== null && minMonthly > 0 && (
                          <div className="text-right shrink-0 -mt-0.5">
                            <p className="font-heading font-bold text-primary text-base leading-none">
                              ₹{minMonthly}
                              <span className="font-body text-[10px] font-medium text-gray-400 ml-0.5">/mo</span>
                            </p>
                            <p className="font-body text-[9px] text-gray-400 uppercase tracking-wider mt-0.5">Starting</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        {worker.rating > 0 ? (
                          <span className="inline-flex items-center gap-0.5">
                            <Star size={12} weight="fill" className="text-amber-400" />
                            <span className="font-body text-xs font-semibold text-gray-700">
                              {worker.rating.toFixed(1)}
                            </span>
                          </span>
                        ) : (
                          <span className="font-body text-[11px] text-gray-400 font-medium">New</span>
                        )}
                        {worker.gender && (
                          <>
                            <span className="text-gray-300 text-xs">·</span>
                            <span className="font-body text-xs text-gray-500 capitalize">{worker.gender}</span>
                          </>
                        )}
                        {worker.isAvailable && (
                          <>
                            <span className="text-gray-300 text-xs">·</span>
                            <span className="font-body text-[11px] font-medium text-emerald-600">Available</span>
                          </>
                        )}
                      </div>

                      {/* KYC badge */}
                      <div className="mt-1.5">
                        {worker.kycStatus === 'approved' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                            <ShieldCheck size={11} weight="fill" />
                            <span className="font-body text-[10px] font-semibold">KYC Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">
                            <ShieldWarning size={11} weight="fill" />
                            <span className="font-body text-[10px] font-semibold">Not Verified</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Services strip */}
                  {worker.pricing.length > 0 && (
                    <div className="px-4 pb-3 flex items-center gap-1 overflow-hidden">
                      {worker.pricing.slice(0, 3).map((p) => (
                        <span
                          key={p.serviceTypeId}
                          className={`text-[11px] rounded-full px-2.5 py-1 font-body font-medium whitespace-nowrap ${
                            SERVICE_PILL_COLORS[p.serviceTypeId] ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {SERVICE_LABELS[p.serviceTypeId] ?? p.serviceTypeId}
                        </span>
                      ))}
                      {worker.pricing.length > 3 && (
                        <span className="text-[11px] font-body font-semibold text-gray-500 px-1">
                          +{worker.pricing.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Schedule strip */}
                  {(worker.shifts?.length > 0 || worker.workingDays.length > 0) && (
                    <div className="mx-4 mb-3 bg-gray-50/80 rounded-xl px-3 py-2.5 space-y-2">
                      {worker.workingDays.length > 0 && (
                        <div className="flex items-center gap-2.5">
                          <span className="font-body text-[9px] font-bold text-gray-400 uppercase tracking-wider w-10 shrink-0">Days</span>
                          <div className="flex gap-1">
                            {DAY_INITIALS.map((d) => (
                              <span
                                key={d.id}
                                className={`font-body text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-md ${
                                  worker.workingDays.includes(d.id) ? "bg-primary text-white" : "bg-white text-gray-300"
                                }`}
                              >
                                {d.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {worker.shifts?.length > 0 && (
                        <div className="flex items-start gap-2.5">
                          <span className="font-body text-[9px] font-bold text-gray-400 uppercase tracking-wider w-10 shrink-0 mt-1">Hours</span>
                          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                            {worker.shifts.map((s, i) => (
                              <span
                                key={i}
                                className="font-body text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-0.5 whitespace-nowrap"
                              >
                                {formatShift(s)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  <div className="px-4 pb-4 pt-1 flex gap-2">
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); setDetailWorker(worker); }}
                      className="flex-1 font-body font-semibold text-sm py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                      whileTap={{ scale: 0.95 }}
                      transition={SPRING}
                    >
                      View Profile
                    </motion.button>
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); setBookingWorker(worker); }}
                      className="flex-1 font-body font-semibold text-sm py-2.5 rounded-xl bg-accent text-white hover:bg-accent-600 transition-colors"
                      whileTap={{ scale: 0.95 }}
                      transition={SPRING}
                    >
                      Book Now
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* ── Worker Detail Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {detailWorker !== null && (
          <WorkerDetailModal
            key="worker-detail"
            worker={detailWorker}
            onClose={() => setDetailWorker(null)}
            onBook={() => {
              setBookingWorker(detailWorker);
              setDetailWorker(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Booking Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {bookingWorker !== null && (
          <BookingModal
            key="booking-modal"
            worker={bookingWorker}
            onClose={() => setBookingWorker(null)}
            onBooked={() => {
              setBookingWorker(null);
              navigate("/resident/bookings");
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Filter Sheet ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilterSheet && (
          <WorkerFilterSheet
            key="filter-sheet"
            initial={filters}
            onApply={setFilters}
            onClose={() => setShowFilterSheet(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
