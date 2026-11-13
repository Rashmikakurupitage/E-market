'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin, RefreshCw, Sparkles, Users, X } from 'lucide-react';
import API from '../lib/api';
import { BUSINESS_TYPES } from '../lib/catalog';
import { useLanguage } from '../lib/i18n';

const TYPE_COLORS = {
  Handicrafts: '#f472b6',
  Textiles: '#60a5fa',
  'Agri-Products': '#34d399',
  'Food & Spices': '#fbbf24',
  'Beauty & Personal Care': '#c084fc',
  Other: '#94a3b8',
};

const ALL_COLOR = '#5eead4';
const normalizeDistrict = (name = '') => name.replace(/\s+District$/i, '').trim().toLowerCase();

export default function SellerDistrictMap() {
  const { t, lang } = useLanguage();
  const h = t;
  const [mapData, setMapData] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [mapRetry, setMapRetry] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/data/sri-lanka-districts.json')
      .then((response) => {
        if (!response.ok) throw new Error('District boundary data could not be loaded.');
        return response.json();
      })
      .then((boundaries) => {
        if (!active) return;
        setMapData(boundaries);
      })
      .catch((error) => {
        if (!active) return;
        setMapError(true);
        console.warn('Sri Lanka district boundaries could not be loaded.', error);
      })
      .finally(() => {
        if (active) setMapLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mapRetry]);

  useEffect(() => {
    let active = true;
    API.get('/site/seller-map')
      .then((response) => {
        if (active) setStats(response.data);
      })
      .catch((error) => {
        if (!active) return;
        setStatsError(true);
        console.warn('Seller district statistics could not be loaded.', error);
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry]);

  const districtStats = useMemo(() => {
    const districts = new Map();
    for (const district of stats?.districts || []) {
      districts.set(normalizeDistrict(district.name), district);
    }
    return districts;
  }, [stats]);

  const selected = useMemo(
    () => (stats?.districts || []).find((district) => normalizeDistrict(district.name) === normalizeDistrict(selectedDistrict))
      || (selectedDistrict ? { name: selectedDistrict, total: 0, businessTypes: [] } : null),
    [stats, selectedDistrict]
  );
  const selectedColor = selectedType === 'all' ? ALL_COLOR : TYPE_COLORS[selectedType] || ALL_COLOR;
  const maxCount = useMemo(() => {
    const counts = (stats?.districts || []).map((district) => {
      if (selectedType === 'all') return district.total;
      return district.businessTypes.find((item) => item.type === selectedType)?.count || 0;
    });
    return Math.max(1, ...counts);
  }, [stats, selectedType]);
  const districtShapes = useMemo(
    () => [...(mapData?.districts || [])].sort((a, b) => {
      const aSelected = normalizeDistrict(a.name) === normalizeDistrict(selectedDistrict);
      const bSelected = normalizeDistrict(b.name) === normalizeDistrict(selectedDistrict);
      return Number(aSelected) - Number(bSelected);
    }),
    [mapData, selectedDistrict]
  );

  const formatNumber = (value) => new Intl.NumberFormat(lang === 'si' ? 'si-LK' : lang === 'ta' ? 'ta-LK' : 'en-LK').format(value || 0);
  const displayedCount = (district) => {
    if (!district || selectedType === 'all') return district?.total || 0;
    return district.businessTypes.find((item) => item.type === selectedType)?.count || 0;
  };
  const visibleTypes = selected
    ? [...selected.businessTypes]
        .filter((item) => selectedType === 'all' || item.type === selectedType)
        .sort((a, b) => b.count - a.count)
    : [...BUSINESS_TYPES]
        .map((type) => ({
          type,
          count: (stats?.districts || []).reduce(
            (total, district) => total + (district.businessTypes.find((item) => item.type === type)?.count || 0),
            0
          ),
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count);
  const districtLink = selected
    ? `/store?district=${encodeURIComponent(selected.name)}${selectedType !== 'all' && selectedType !== 'Other' ? `&category=${encodeURIComponent(selectedType)}` : ''}`
    : '/store';

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20" aria-labelledby="seller-map-title">
      <div className="mb-8 max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800">
          <Sparkles className="h-3.5 w-3.5" />
          {h.sellerMapEyebrow}
        </span>
        <h2 id="seller-map-title" className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          {h.sellerMapTitle}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{h.sellerMapSub}</p>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_-38px_rgba(15,23,42,0.42)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap gap-2" role="group" aria-label={h.sellerMapBusinessTypes}>
            <button
              type="button"
              onClick={() => setSelectedType('all')}
              aria-pressed={selectedType === 'all'}
              className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${selectedType === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {h.sellerMapAllTypes}
            </button>
            {BUSINESS_TYPES.map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => setSelectedType(type)}
                aria-pressed={selectedType === type}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition ${selectedType === type ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                {t.categories[type] || type}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedColor }} />
            {selectedType === 'all' ? h.sellerMapSellers : (t.categories[selectedType] || selectedType)}
          </div>
        </div>

        {mapError ? (
          <div className="grid min-h-80 place-items-center px-6 py-12 text-center">
            <div>
              <MapPin className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">{h.sellerMapError}</p>
              <button
                type="button"
                onClick={() => {
                  setMapError(false);
                  setMapLoading(true);
                  setMapRetry((value) => value + 1);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {h.sellerMapRetry}
              </button>
            </div>
          </div>
        ) : mapLoading || !mapData ? (
          <div className="grid min-h-80 place-items-center px-6 py-12 text-center text-sm font-semibold text-slate-500" role="status">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              {h.sellerMapLoading}
            </span>
          </div>
        ) : (
          <>
          {statsError && (
            <div className="flex flex-col gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>{h.sellerMapStatsError}</p>
              <button
                type="button"
                onClick={() => {
                  setStatsLoading(true);
                  setStatsError(false);
                  setRetry((value) => value + 1);
                }}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-xs font-bold text-amber-950 transition hover:bg-amber-100 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
                {statsLoading ? h.sellerMapLoading : h.sellerMapRetry}
              </button>
            </div>
          )}
          {statsLoading && !statsError && (
            <div className="border-b border-slate-100 px-4 py-2 text-center text-xs font-medium text-slate-500" role="status">
              {h.sellerMapLoading}
            </div>
          )}
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative overflow-hidden bg-[#062d2c] px-3 py-6 sm:px-8 sm:py-8">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_55%_42%,rgba(45,212,191,0.20),transparent_58%),linear-gradient(140deg,transparent_30%,rgba(255,255,255,0.035))]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#99f6e4_0.7px,transparent_0.7px)] [background-size:18px_18px]" />
              <div className="relative mx-auto max-w-[500px]">
                <div className="absolute left-3 top-2 z-10 rounded-full border border-white/15 bg-slate-950/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-teal-100/80 backdrop-blur">
                  Sri Lanka · {stats ? `${stats.activeDistricts} / 25` : '25 districts'}
                </div>
                <svg
                  viewBox={mapData.viewBox}
                  className="relative z-0 mx-auto block h-[360px] w-full overflow-visible drop-shadow-[0_20px_28px_rgba(0,0,0,0.35)] sm:h-[500px]"
                  role="img"
                  aria-label={h.sellerMapTitle}
                >
                  {mapData.districts.map((shape) => (
                    <path
                      key={`shadow-${shape.name}`}
                      d={shape.path}
                      transform="translate(0 11)"
                      fill="#031e20"
                      stroke="#031e20"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  ))}
                  {districtShapes.map((shape) => {
                    const district = districtStats.get(normalizeDistrict(shape.name));
                    const count = displayedCount(district);
                    const isSelected = normalizeDistrict(shape.name) === normalizeDistrict(selectedDistrict);
                    const intensity = count ? 0.3 + (count / maxCount) * 0.68 : 0.08;
                    const districtColor = !stats
                      ? isSelected ? 'rgba(94,234,212,0.78)' : 'rgba(94,234,212,0.14)'
                      : selectedType === 'all'
                        ? `rgba(94,234,212,${intensity})`
                        : `color-mix(in srgb, ${selectedColor} ${Math.round(intensity * 100)}%, #123d3c)`;
                    return (
                      <g
                        key={shape.name}
                        className="cursor-pointer outline-none transition-transform duration-300 ease-out motion-reduce:transition-none"
                        style={{
                          transform: isSelected ? 'translateY(-13px)' : 'translateY(0)',
                          transformBox: 'fill-box',
                          transformOrigin: 'center',
                          filter: isSelected ? 'drop-shadow(0 9px 6px rgba(0,0,0,0.38))' : undefined,
                        }}
                      >
                        {isSelected && (
                          <path
                            d={shape.path}
                            transform="translate(0 7)"
                            fill="#07564c"
                            stroke="#052d2c"
                            strokeLinejoin="round"
                            strokeWidth="1.2"
                          />
                        )}
                        <path
                          d={shape.path}
                          fill={districtColor}
                          fillRule="evenodd"
                          stroke={isSelected ? '#fff7ed' : '#9bf3df'}
                          strokeLinejoin="round"
                          strokeWidth={isSelected ? '2.5' : '0.8'}
                          vectorEffect="non-scaling-stroke"
                          className="outline-none transition-[fill,stroke,opacity] duration-200 hover:brightness-125 focus:outline-none focus-visible:stroke-white"
                          style={{ outline: 'none' }}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`${shape.name}: ${stats ? `${formatNumber(count)} ${h.sellerMapSellers}` : h.sellerMapUnavailable}`}
                          onClick={() => setSelectedDistrict(shape.name)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedDistrict(shape.name);
                            }
                          }}
                        >
                          <title>{shape.name}: {stats ? `${formatNumber(count)} ${h.sellerMapSellers}` : h.sellerMapUnavailable}</title>
                        </path>
                      </g>
                    );
                  })}
                </svg>
                <p className="relative mt-1 text-center text-[11px] font-medium text-teal-100/65">{h.sellerMapSelectDistrict}</p>
              </div>
              <div className="relative mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-semibold text-teal-50/70">
                <span>0</span>
                <span className="h-2 w-24 rounded-full bg-gradient-to-r from-teal-900 via-teal-500 to-teal-100" />
                <span>{formatNumber(maxCount)} {h.sellerMapSellers}</span>
              </div>
            </div>

            <aside aria-live="polite" className="flex flex-col justify-between p-5 sm:p-7 lg:p-8">
              <div key={selectedDistrict || 'all'} className="animate-fade-up">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-magenta">
                      {selected ? h.sellerMapDistrictSelected : h.sellerMapBusinessTypes}
                    </p>
                    <h3 className="mt-2 truncate text-3xl font-black tracking-tight text-slate-950">
                      {selected ? selected.name : stats ? formatNumber(stats.totalSellers) : '—'}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {selected ? `${formatNumber(displayedCount(selected))} ${h.sellerMapSellers}` : h.sellerMapSellers}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {selected && (
                      <button
                        type="button"
                        onClick={() => setSelectedDistrict('')}
                        aria-label={h.sellerMapClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      {selected ? <MapPin className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                    <p className="text-xl font-extrabold text-slate-900">
                      {selected ? formatNumber(selected.total) : stats ? formatNumber(stats.totalSellers) : '—'}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{h.sellerMapSellers}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                    <p className="text-xl font-extrabold text-slate-900">
                      {selected ? formatNumber(selected.businessTypes.length) : stats ? <>{formatNumber(stats.activeDistricts)}<span className="text-slate-400">/25</span></> : '—'}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      {selected ? h.sellerMapBusinessTypes : h.sellerMapDistricts}
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900">{h.sellerMapBusinessTypes}</h4>
                    {selectedType !== 'all' && (
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-bold text-slate-800" style={{ backgroundColor: `${selectedColor}22` }}>
                        {t.categories[selectedType] || selectedType}
                      </span>
                    )}
                  </div>
                  {!stats ? (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">{h.sellerMapUnavailable}</p>
                  ) : visibleTypes.length ? (
                    <ul className="space-y-3">
                      {visibleTypes.slice(0, 6).map(({ type, count }) => {
                        const percent = Math.max(4, Math.round((count / Math.max(1, ...visibleTypes.map((item) => item.count))) * 100));
                        return (
                          <li key={type}>
                            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                              <span className="font-semibold text-slate-600">{t.categories[type] || type}</span>
                              <span className="font-extrabold tabular-nums text-slate-900">{formatNumber(count)}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: TYPE_COLORS[type] || ALL_COLOR }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">{h.sellerMapNoSellers}</p>
                  )}
                </div>
              </div>

              <div className="mt-7">
                <Link
                  href={districtLink}
                  className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition hover:bg-magenta"
                >
                  {h.sellerMapBrowse}
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <p className="mt-3 text-center text-[10px] leading-relaxed text-slate-400">
                  District boundary data: <a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer" className="font-bold underline decoration-slate-300 underline-offset-2 hover:text-slate-600">geoBoundaries</a>
                </p>
              </div>
            </aside>
          </div>
          </>
        )}
      </div>
    </section>
  );
}
