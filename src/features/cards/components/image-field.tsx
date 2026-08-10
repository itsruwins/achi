"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "card-images";
const MAX_BYTES = 5 * 1024 * 1024;

type Props = {
  name: string;
  label: string;
  userId: string;
  defaultValue?: string | null;
};

/**
 * Optional image for one side of a card.
 *
 * Uploads straight from the browser to Supabase Storage and puts the resulting
 * public URL in a hidden input, so the surrounding server action just sees a
 * string. Routing the file through a server action instead would mean holding
 * the whole upload in server memory for no benefit.
 *
 * The storage policy requires the first path segment to be the uploader's own
 * user id, so a tampered client can only ever write into its own folder.
 */
export function ImageField({ name, label, userId, defaultValue }: Props) {
  const [url, setUrl] = useState<string | null>(defaultValue ?? null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);

    if (file.size > MAX_BYTES) {
      setError("Images must be under 5 MB.");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "31536000", upsert: false });

    setUploading(false);

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    setUrl(data.publicUrl);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url ?? ""} />

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            // Reset so picking the same file twice still fires onChange.
            event.target.value = "";
          }}
        />

        <Button
          size="sm"
          variant="secondary"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {url ? `Replace ${label}` : `Add ${label}`}
        </Button>

        {url ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setUrl(null)}
            // Only detaches the image from the card; the stored object stays.
            // Deleting it here would break any deck that was duplicated while
            // the image was still attached.
          >
            Remove
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      {url ? (
        // Plain <img>: these are arbitrary user uploads on a Supabase domain,
        // and next/image would need that host allow-listed in next.config.ts
        // plus an optimizer round trip for images that are already small.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="max-h-32 rounded-control border border-border object-contain"
        />
      ) : null}
    </div>
  );
}
