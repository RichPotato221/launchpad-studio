import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";

const BUCKET = "announcement-media";

/**
 * Photo picker used everywhere a photo is captured: an "Insert photo" tab that
 * uploads straight from the device, plus a link tab for photos already online.
 */
export default function PhotoField({
  label = "Photo",
  value,
  onChange,
  folder = "photos",
}: {
  label?: string;
  value?: string | null;
  onChange: (url: string) => void;
  folder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await getAuthUserResult();
      const uid = auth.user?.id ?? "anon";
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${folder}/${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Photo uploaded.");
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <Tabs defaultValue="upload" className="mt-1">
        <TabsList className="h-8">
          <TabsTrigger value="upload" className="text-xs">Insert photo</TabsTrigger>
          <TabsTrigger value="link" className="text-xs">Photo link</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            {busy ? "Uploading…" : "Choose photo"}
          </Button>
        </TabsContent>

        <TabsContent value="link" className="mt-2">
          <Input
            placeholder="https://…"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </TabsContent>
      </Tabs>

      {value ? (
        <div className="mt-2 flex items-center gap-2">
          <img src={value} alt="Selected" className="h-14 w-14 rounded-md border border-border object-cover" />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
            <X className="mr-1 h-3 w-3" /> Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}
