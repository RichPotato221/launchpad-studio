import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { branchLabel, fmtDate } from "@/lib/finance";
import { AGREEMENT_TERMS, movementTypeLabel, pretty } from "@/lib/assetMovement";

type Props = {
  movement: any;
  items: any[];
  handovers: any[];
  approvals: any[];
  extensions: any[];
  incidents: any[];
  nameOf: (id?: string | null) => string;
};

/**
 * Printable / downloadable TROGKC Inter-Branch Asset Movement &
 * Resource Loan Agreement. Uses the browser print pipeline so the
 * document can be viewed, printed or saved as PDF.
 */
export default function MovementAgreementDoc({
  movement, items, handovers, approvals, extensions, incidents, nameOf,
}: Props) {
  const [agreementQr, setAgreementQr] = useState("");
  const [assetQrs, setAssetQrs] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const a = await QRCode.toDataURL(movement.agreement_no ?? movement.id, { width: 160, margin: 1 });
      const map: Record<string, string> = {};
      for (const it of items) {
        const ref = it.asset?.asset_ref ?? it.asset?.qr_token ?? it.asset_id;
        map[it.id] = await QRCode.toDataURL(String(ref), { width: 120, margin: 1 });
      }
      if (alive) { setAgreementQr(a); setAssetQrs(map); }
    })();
    return () => { alive = false; };
  }, [movement.id, movement.agreement_no, items]);

  const dispatch = handovers.find((h) => h.kind === "dispatch");
  const receipt = handovers.find((h) => h.kind === "receipt");
  const returned = handovers.find((h) => h.kind === "return");
  const inspection = handovers.find((h) => h.kind === "return_inspection");

  const print = () => {
    const el = document.getElementById("movement-agreement-print");
    if (!el) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(`<html><head><title>${movement.agreement_no}</title>
      <style>
        body{font-family:Georgia,'Times New Roman',serif;color:#1f2933;margin:36px;line-height:1.5}
        h1{font-size:16px;letter-spacing:.06em;text-align:center;margin:0}
        h2{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#0f3b45;margin:22px 0 6px;border-bottom:1px solid #cbd5d8;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #cbd5d8;padding:6px 8px;text-align:left;vertical-align:top}
        th{background:#0f3b45;color:#fff;font-weight:600}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;font-size:11px}
        .lbl{color:#5b6b70;text-transform:uppercase;font-size:9px;letter-spacing:.1em}
        ol{font-size:10.5px;padding-left:18px}
        .sig{display:grid;grid-template-columns:1fr 1fr;gap:18px;font-size:11px}
        .box{border:1px solid #cbd5d8;padding:10px;border-radius:4px}
        .muted{color:#5b6b70;font-size:10px}
      </style></head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const Field = ({ l, v }: { l: string; v: any }) => (
    <div><div className="lbl">{l}</div><div>{v ?? "—"}</div></div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={print}>Print / Save as PDF</Button>
      </div>

      <div id="movement-agreement-print" className="rounded-lg border bg-card p-6 text-sm">
        <div style={{ textAlign: "center" }}>
          <h1>THRONE ROOM OF GOD KINGDOM CENTRE (TROGKC)</h1>
          <h1>INTER-BRANCH ASSET MOVEMENT &amp; RESOURCE LOAN AGREEMENT</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Agreement {movement.agreement_no} · Status {pretty(movement.status)} · Generated {fmtDate(new Date().toISOString())}
          </p>
          {agreementQr && <img src={agreementQr} alt={`QR code for agreement ${movement.agreement_no}`} width={110} height={110} />}
        </div>

        <h2>Movement details</h2>
        <div className="grid">
          <Field l="Agreement number" v={movement.agreement_no} />
          <Field l="Movement type" v={movementTypeLabel(movement.movement_type)} />
          <Field l="Source branch" v={branchLabel(movement.source_branch)} />
          <Field l="Destination branch" v={branchLabel(movement.destination_branch)} />
          <Field l="Destination location" v={movement.destination_location} />
          <Field l="Department" v={pretty(movement.department_slug)} />
          <Field l="Purpose" v={movement.purpose} />
          <Field l="Requested by" v={nameOf(movement.requested_by)} />
          <Field l="Responsible person" v={movement.responsible_name ?? nameOf(movement.responsible_person)} />
          <Field l="Dispatch date" v={fmtDate(movement.dispatch_date)} />
          <Field l="Original return date" v={fmtDate(movement.original_return_date)} />
          <Field l="Expected return date" v={fmtDate(movement.expected_return_date)} />
          <Field l="Actual return date" v={fmtDate(movement.actual_return_date)} />
          <Field l="Transport" v={movement.transport_details} />
          <Field l="Driver" v={movement.driver_name} />
          <Field l="Vehicle" v={movement.vehicle_details} />
          {movement.event_name && <Field l="Event" v={`${movement.event_name} · ${movement.event_location ?? ""}`} />}
          {movement.is_emergency && <Field l="Emergency movement" v={movement.emergency_reason ?? "Recorded as emergency"} />}
        </div>
        {movement.notes && <p className="muted" style={{ marginTop: 8 }}>Notes: {movement.notes}</p>}

        <h2>Asset schedule</h2>
        <table>
          <thead>
            <tr><th>Asset reference</th><th>Asset</th><th>Serial</th><th>Qty</th><th>Condition out</th><th>Condition back</th><th>QR</th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.asset?.asset_ref ?? "—"}</td>
                <td>{it.asset?.name ?? "—"}<br /><span className="muted">{it.accessories ? `Accessories: ${it.accessories}` : ""}</span></td>
                <td>{it.asset?.serial_number ?? "—"}</td>
                <td>{it.quantity}</td>
                <td>{pretty(it.condition_before)}</td>
                <td>{pretty(it.condition_after)}</td>
                <td>{assetQrs[it.id] && <img src={assetQrs[it.id]} alt={`QR code for ${it.asset?.name ?? "asset"}`} width={64} height={64} />}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7}>No assets on this agreement.</td></tr>}
          </tbody>
        </table>

        <h2>Approvals</h2>
        <table>
          <thead><tr><th>Decision</th><th>By</th><th>Role / branch</th><th>Date</th><th>Comment</th></tr></thead>
          <tbody>
            {approvals.map((a) => (
              <tr key={a.id}>
                <td>{pretty(a.decision)}{a.retrospective ? " (retrospective)" : ""}</td>
                <td>{nameOf(a.decided_by)}</td>
                <td>{pretty(a.decided_by_role)} · {branchLabel(a.decided_by_branch)}</td>
                <td>{fmtDate(a.created_at)}</td>
                <td>{a.comment ?? "—"}</td>
              </tr>
            ))}
            {approvals.length === 0 && <tr><td colSpan={5}>Awaiting approval.</td></tr>}
          </tbody>
        </table>

        <h2>Confirmations</h2>
        <div className="sig">
          {[
            ["Dispatch / handover", dispatch],
            ["Receipt at destination", receipt],
            ["Return handover", returned],
            ["Return inspection", inspection],
          ].map(([label, h]: any) => (
            <div className="box" key={label}>
              <div className="lbl">{label}</div>
              {h ? (
                <>
                  <div>{h.person_name} · {pretty(h.person_role)}</div>
                  <div className="muted">{branchLabel(h.branch)} · {new Date(h.acknowledged_at).toLocaleString("en-ZA")}</div>
                  <div>Condition: {pretty(h.condition_summary)}</div>
                  {h.accessories && <div>Accessories: {h.accessories}</div>}
                  {h.discrepancies && <div>Discrepancies: {h.discrepancies}</div>}
                  <div className="muted">Digitally acknowledged in the TROGKC Leadership Domain.</div>
                </>
              ) : <div className="muted">Not yet confirmed.</div>}
            </div>
          ))}
        </div>

        {extensions.length > 0 && (
          <>
            <h2>Extensions</h2>
            <table>
              <thead><tr><th>Original return</th><th>New return</th><th>Reason</th><th>Requested by</th><th>Status</th></tr></thead>
              <tbody>
                {extensions.map((e) => (
                  <tr key={e.id}>
                    <td>{fmtDate(e.original_return_date)}</td>
                    <td>{fmtDate(e.requested_return_date)}</td>
                    <td>{e.reason ?? "—"}</td>
                    <td>{nameOf(e.requested_by)}</td>
                    <td>{pretty(e.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {incidents.length > 0 && (
          <>
            <h2>Incidents</h2>
            <table>
              <thead><tr><th>Type</th><th>Status</th><th>Reported</th><th>Description</th></tr></thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id}>
                    <td>{pretty(i.incident_type)}</td>
                    <td>{pretty(i.status)}</td>
                    <td>{fmtDate(i.created_at)}</td>
                    <td>{i.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>Terms of this agreement</h2>
        <ol>{AGREEMENT_TERMS.map((t) => <li key={t}>{t}</li>)}</ol>

        <p className="muted" style={{ marginTop: 14 }}>
          Audit reference: {movement.id} · Created {fmtDate(movement.created_at)} by {nameOf(movement.created_by)} ·
          Last updated {fmtDate(movement.updated_at)}. This document is generated from the official TROGKC asset
          register and movement record; every action shown here is preserved in the system audit trail.
        </p>
      </div>
    </div>
  );
}
