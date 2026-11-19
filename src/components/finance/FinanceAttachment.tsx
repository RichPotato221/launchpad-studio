import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { attachmentPath } from "@/lib/financeAttachment";
export default function FinanceAttachment({ value, label = "Supporting document" }: { value: string; label?: string }) {
  const [opening, setOpening] = useState(false);
  return <Button size="sm" variant="link" disabled={opening} onClick={async () => {
    const tab = window.open("about:blank", "_blank"); if (tab) tab.opener = null;
    setOpening(true);
    try {
      const ref = attachmentPath(value); let url = value;
      if (ref) { const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, 300); if (error) throw error; url = data.signedUrl; }
      if (!/^https?:\/\//.test(url)) throw new Error("This attachment needs to be uploaded again.");
      if (tab) tab.location.href = url; else toast.error("Allow a new tab to open this document.");
    } catch (e: any) { tab?.close(); toast.error(e.message ?? "Could not open document"); } finally { setOpening(false); }
  }}>{opening ? "Opening…" : label}</Button>;
}
