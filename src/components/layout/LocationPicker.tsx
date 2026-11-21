"use client";

import { useState, useTransition } from "react";
import { Crosshair, MapPin, X } from "lucide-react";
import { nearestCityAction, setLocationAction } from "@/app/actions/prefs";

interface Country { code: string; name: string; flag: string; cities: { id: string; name: string }[] }

export function LocationPicker({
  countries, current, labels,
}: {
  countries: Country[];
  current: { country?: string; cityId?: string; label: string };
  labels: { allCountries: string; allCities: string; deliverFrom: string; apply: string; locate: string; title: string };
}) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState(current.country ?? "");
  const [cityId, setCityId] = useState(current.cityId ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const cities = countries.find((c) => c.code === country)?.cities ?? [];

  const locate = () => {
    if (!navigator.geolocation) return setMsg("Géolocalisation indisponible.");
    // Le navigateur demande le consentement de l'utilisateur.
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await nearestCityAction(pos.coords.latitude, pos.coords.longitude);
        if (r) { setCountry(r.country); setCityId(r.cityId); setMsg(""); } else setMsg("Aucune ville proche trouvée, choisissez manuellement.");
      },
      () => setMsg("Autorisation refusée : choisissez votre ville manuellement."),
      { timeout: 8000, maximumAge: 600000 },
    );
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-[rgb(var(--surface-2))]">
        <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
        <span className="hidden text-xs muted lg:inline">{labels.deliverFrom}</span>
        <span className="max-w-[9rem] truncate font-semibold">{current.label}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={labels.title} className="card w-full max-w-md animate-rise rounded-b-none p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">{labels.title}</h2>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-lg p-1 hover:bg-[rgb(var(--surface-2))]"><X className="h-5 w-5" /></button>
            </div>
            <button type="button" onClick={locate} className="btn-ghost mb-4 w-full"><Crosshair className="h-4 w-4" />{labels.locate}</button>
            <label className="label" htmlFor="loc-country">Pays</label>
            <select id="loc-country" className="input mb-3" value={country} onChange={(e) => { setCountry(e.target.value); setCityId(""); }}>
              <option value="">{labels.allCountries}</option>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
            </select>
            <label className="label" htmlFor="loc-city">Ville</label>
            <select id="loc-city" className="input mb-4" value={cityId} onChange={(e) => setCityId(e.target.value)} disabled={!country}>
              <option value="">{labels.allCities}</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {msg && <p className="mb-3 text-sm muted">{msg}</p>}
            <button className="btn-primary w-full" disabled={pending} onClick={() => start(async () => { await setLocationAction(country, cityId); setOpen(false); })}>
              {labels.apply}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
