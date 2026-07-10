"use client";

import { useState } from "react";
import { METHOD_LIBRARY, compareMethods, findMethod } from "@/domain/methods/library";
import { Select } from "@/components/ui/form";
import { es } from "@/lib/i18n/es";

// Two-method comparison table (RF9.4), computed client-side from the static
// library.
export function MethodComparator() {
  const [a, setA] = useState("scrum");
  const [b, setB] = useState("kanban");
  const methodA = findMethod(a);
  const methodB = findMethod(b);
  const rows = methodA && methodB ? compareMethods(methodA, methodB) : [];

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-lg font-semibold">{es.methods.comparatorTitle}</h2>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-neutral-500">{es.methods.methodA}</span>
          <Select value={a} onChange={(e) => setA(e.target.value)}>
            {METHOD_LIBRARY.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-neutral-500">{es.methods.methodB}</span>
          <Select value={b} onChange={(e) => setB(e.target.value)}>
            {METHOD_LIBRARY.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {methodA && methodB && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-2 py-1 text-left font-medium">{es.methods.criterion}</th>
                <th className="px-2 py-1 text-left font-medium">{methodA.name}</th>
                <th className="px-2 py-1 text-left font-medium">{methodB.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.criterion}
                  className="border-b border-neutral-100 align-top dark:border-neutral-800/60"
                >
                  <td className="px-2 py-1 text-neutral-500">
                    {es.methods.criteria[row.criterion]}
                  </td>
                  <td className="px-2 py-1">{row.a}</td>
                  <td className="px-2 py-1">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
