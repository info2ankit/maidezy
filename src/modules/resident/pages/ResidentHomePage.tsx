import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Buildings,
  MagnifyingGlass,
  X,
  Users,
  ClockAfternoon,
  CalendarDot,
  Star,
} from "@phosphor-icons/react";
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
  maid: {
    icon: "text-purple-600",
    bg: "bg-purple-50",
    activeBg: "bg-purple-600",
  },
  jhadu_pocha: {
    icon: "text-blue-600",
    bg: "bg-blue-50",
    activeBg: "bg-blue-600",
  },
  bartan: { icon: "text-teal-600", bg: "bg-teal-50", activeBg: "bg-teal-600" },
  cooking: {
    icon: "text-orange-600",
    bg: "bg-orange-50",
    activeBg: "bg-orange-600",
  },
  car_cleaning: {
    icon: "text-slate-600",
    bg: "bg-slate-100",
    activeBg: "bg-slate-600",
  },
  laundry: { icon: "text-sky-600", bg: "bg-sky-50", activeBg: "bg-sky-600" },
  child_care: {
    icon: "text-pink-600",
    bg: "bg-pink-50",
    activeBg: "bg-pink-600",
  },
  elder_care: {
    icon: "text-rose-600",
    bg: "bg-rose-50",
    activeBg: "bg-rose-600",
  },
  deep_cleaning: {
    icon: "text-green-600",
    bg: "bg-green-50",
    activeBg: "bg-green-600",
  },
  full_time: {
    icon: "text-indigo-600",
    bg: "bg-indigo-50",
    activeBg: "bg-indigo-600",
  },
};

const SERVICE_PILL_COLORS: Record<string, string> = {
  maid: "bg-purple-100 text-purple-700",
  jhadu_pocha: "bg-blue-100 text-blue-700",
  bartan: "bg-teal-100 text-teal-700",
  cooking: "bg-orange-100 text-orange-700",
  car_cleaning: "bg-slate-100 text-slate-700",
  laundry: "bg-sky-100 text-sky-700",
  child_care: "bg-pink-100 text-pink-700",
  elder_care: "bg-rose-100 text-rose-700",
  deep_cleaning: "bg-green-100 text-green-700",
  full_time: "bg-indigo-100 text-indigo-700",
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

function WorkerAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="w-12 h-12 rounded-full object-cover shrink-0"
      />
    );
  }
  const initial = name[0]?.toUpperCase() ?? "?";
  return (
    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <span className="font-heading font-bold text-primary text-lg">
        {initial}
      </span>
    </div>
  );
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
      btn?.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }

  // Filter workers by active category AND search query
  const workers = allWorkers.filter((w) => {
    const matchesCategory =
      !activeCategory ||
      w.pricing.some((p) => p.serviceTypeId === activeCategory);
    if (!matchesCategory) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = w.name.toLowerCase().includes(q);
    const serviceMatch = w.pricing.some((p) =>
      (SERVICE_LABELS[p.serviceTypeId] ?? p.serviceTypeId)
        .toLowerCase()
        .includes(q),
    );
    return nameMatch || serviceMatch;
  });

  const displayName = user?.name?.split(" ")[0] ?? "there";
  const initial = (user?.name ?? "U")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-bg">
      {/* ── Gradient header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary to-[#2a4f7a] px-5 pt-12 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-heading font-bold text-base">
              {initial}
            </span>
          </div>
          <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Bell size={20} weight="regular" className="text-white" />
          </button>
        </div>

        <p className="font-body text-white/70 text-sm">{getGreeting()},</p>
        <h1 className="font-heading font-bold text-xl text-white mb-3">
          {displayName} 👋
        </h1>

        {societyName && (
          <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
            <Buildings size={14} weight="duotone" className="text-white/90" />
            <span className="font-body text-white/90 text-xs font-medium">
              {societyName}
            </span>
          </div>
        )}
      </div>

      {/* ── Search bar (overlapping header) ─────────────────────────── */}
      <div className="mx-4 -mt-5 mb-4">
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 flex items-center gap-3 px-4 py-3.5">
          <MagnifyingGlass
            size={18}
            weight="regular"
            className="text-gray-400 shrink-0"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeCategory) setActiveCategory(null);
            }}
            placeholder="Search workers or services…"
            className="flex-1 font-body text-sm text-gray-700 placeholder:text-gray-400 bg-transparent outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="shrink-0">
              <X size={16} weight="bold" className="text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* ── Service icon filter row ──────────────────────────────────── */}
      <div
        ref={chipScrollRef}
        className="flex gap-3 px-4 mb-5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {/* All */}
        <button
          onClick={() => selectCategory(null)}
          className="flex flex-col items-center gap-1.5 flex-none"
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
              !activeCategory ? "bg-primary shadow-sm" : "bg-gray-100"
            }`}
          >
            <Users
              size={30}
              weight="duotone"
              className={!activeCategory ? "text-white" : "text-gray-500"}
            />
          </div>
          <span
            className={`font-body text-[10px] font-semibold ${
              !activeCategory ? "text-primary" : "text-gray-500"
            }`}
          >
            All
          </span>
        </button>

        {SERVICE_TYPES.map((s) => {
          const isActive = activeCategory === s.id;
          const colors = SERVICE_COLORS[s.id] ?? {
            icon: "text-gray-500",
            bg: "bg-gray-100",
            activeBg: "bg-gray-600",
          };
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              data-id={s.id}
              onClick={() => selectCategory(isActive ? null : s.id)}
              className="flex flex-col items-center gap-1.5 flex-none"
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  isActive ? `${colors.activeBg} shadow-sm` : colors.bg
                }`}
              >
                <Icon
                  size={30}
                  weight="duotone"
                  className={isActive ? "text-white" : colors.icon}
                />
              </div>
              <span
                className={`font-body text-[10px] font-semibold text-center leading-tight max-w-[56px] ${
                  isActive ? "text-primary" : "text-gray-500"
                }`}
              >
                {SERVICE_LABELS[s.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Workers list ─────────────────────────────────────────────── */}
      <div className="px-4 pb-6">
        {/* Section label */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-gray-800 text-base">
            {activeCategory
              ? `${SERVICE_LABELS[activeCategory] ?? activeCategory} Workers`
              : searchQuery
                ? `Results for "${searchQuery}"`
                : "Workers in your society"}
          </h2>
          {!isLoading && (
            <span className="font-body text-xs text-gray-400">
              {workers.length} found
            </span>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : workers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              searchQuery
                ? `No results for "${searchQuery}"`
                : activeCategory
                  ? `No ${SERVICE_LABELS[activeCategory] ?? activeCategory} workers`
                  : "No workers yet"
            }
            description={
              searchQuery || activeCategory
                ? "Try a different search or filter."
                : "Verified workers will appear here once they register."
            }
          />
        ) : (
          <div className="space-y-3">
            {workers.map((worker) => {
              const minMonthly =
                worker.pricing.length > 0
                  ? Math.min(...worker.pricing.map((p) => p.monthlyRate))
                  : null;

              return (
                <div
                  key={worker.userId}
                  className="card flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform"
                  onClick={() => setDetailWorker(worker)}
                >
                  <WorkerAvatar name={worker.name} photoUrl={worker.photoUrl} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-body font-semibold text-gray-800 text-sm">
                        {worker.name}
                      </p>
                      {worker.gender && (
                        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-body capitalize">
                          {worker.gender}
                        </span>
                      )}
                    </div>
                    {worker.rating > 0 && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={11}
                            weight={s <= Math.round(worker.rating) ? "fill" : "regular"}
                            className={s <= Math.round(worker.rating) ? "text-amber-400" : "text-gray-200"}
                          />
                        ))}
                        <span className="font-body text-[11px] text-gray-500 ml-0.5">
                          {worker.rating.toFixed(1)}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 mt-1">
                      {worker.pricing.map((p) => (
                        <span
                          key={p.serviceTypeId}
                          className={`text-xs rounded-full px-2 py-0.5 font-body font-medium ${
                            SERVICE_PILL_COLORS[p.serviceTypeId] ??
                            "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {SERVICE_LABELS[p.serviceTypeId] ?? p.serviceTypeId}
                        </span>
                      ))}
                    </div>

                    {/* Availability */}
                    {(worker.shifts?.length > 0 || worker.workingDays.length > 0) && (
                      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                        {worker.workingDays.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <CalendarDot size={13} weight="fill" className="text-primary/50 shrink-0" />
                            <div className="flex gap-0.5">
                              {DAY_INITIALS.map((d) => (
                                <span
                                  key={d.id}
                                  className={`font-body text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                                    worker.workingDays.includes(d.id)
                                      ? "bg-primary text-white"
                                      : "text-gray-300"
                                  }`}
                                >
                                  {d.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {worker.shifts?.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <ClockAfternoon size={14} weight="fill" className="text-primary/50 shrink-0" />
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                              {worker.shifts.map((s, i) => (
                                <span key={i} className="font-body text-[11px] text-gray-500">
                                  {formatShift(s)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {minMonthly !== null && minMonthly > 0 && (
                      <p className="font-body text-xs text-primary font-semibold mt-1">
                        From ₹{minMonthly}/mo
                      </p>
                    )}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); setBookingWorker(worker); }}
                    className="btn-primary !px-4 !py-2 !text-sm shrink-0"
                  >
                    Book
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Worker Detail Modal ──────────────────────────────────────── */}
      {detailWorker !== null && (
        <WorkerDetailModal
          worker={detailWorker}
          onClose={() => setDetailWorker(null)}
          onBook={() => {
            setBookingWorker(detailWorker);
            setDetailWorker(null);
          }}
        />
      )}

      {/* ── Booking Modal ────────────────────────────────────────────── */}
      {bookingWorker !== null && (
        <BookingModal
          worker={bookingWorker}
          onClose={() => setBookingWorker(null)}
          onBooked={() => {
            setBookingWorker(null);
            navigate("/resident/bookings");
          }}
        />
      )}
    </div>
  );
}
