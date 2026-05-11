import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, ImagePlus } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";

const DOCUMENTATION_BUCKET = "documentation";

type Doc = {
  id: string;
  title: string;
  caption: string;
  image_path: string;
  created_at: string;
};

type Props = { role: string | null };

const publicUrl = (path: string) =>
  supabase.storage.from(DOCUMENTATION_BUCKET).getPublicUrl(path).data.publicUrl;

const createStoragePath = (fileName: string) => {
  const extension = fileName.split(".").pop() || "jpg";
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${randomPart}.${extension}`;
};

export const DokumentasiTab = ({ role }: Props) => {
  const isAdmin = role === "admin";
  const loadIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState<Doc | null>(null);

  const load = useCallback(async (showLoading = true) => {
    const loadId = ++loadIdRef.current;

    if (showLoading || !hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("documentation")
          .select("*")
          .order("created_at", { ascending: false }),
        "Memuat dokumentasi terlalu lama. Coba refresh halaman.",
        12000
      );

      if (loadId !== loadIdRef.current) return;

      if (error) {
        toast.error(`Gagal memuat dokumentasi: ${error.message}`);
        console.error("Load documentation error:", error);
        return;
      }

      setDocs(data ?? []);
      hasLoadedRef.current = true;
    } catch (error) {
      if (loadId !== loadIdRef.current) return;

      const message = error instanceof Error ? error.message : "Gagal memuat dokumentasi";
      toast.error(message);
      console.error("Load documentation error:", error);
    } finally {
      if (loadId === loadIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const reloadWhenActive = () => {
      if (document.visibilityState === "visible") {
        load(!hasLoadedRef.current);
      }
    };

    document.addEventListener("visibilitychange", reloadWhenActive);
    window.addEventListener("focus", reloadWhenActive);

    return () => {
      document.removeEventListener("visibilitychange", reloadWhenActive);
      window.removeEventListener("focus", reloadWhenActive);
    };
  }, [load]);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return toast.error("Ukuran gambar maksimal 5MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => {
    setTitle(""); setCaption(""); setFile(null); setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const addDoc = async () => {
    if (!title.trim() || !file) return toast.error("Judul dan gambar wajib diisi");
    setBusy(true);

    try {
      const path = createStoragePath(file.name);

      const { error: uploadError } = await withTimeout(
        supabase.storage
          .from(DOCUMENTATION_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
          }),
        "Upload terlalu lama. Pastikan bucket storage documentation sudah dibuat."
      );

      if (uploadError) {
        toast.error(`Gagal mengunggah gambar: ${uploadError.message}`);
        console.error("Upload documentation error:", uploadError);
        return;
      }

      const { error: insertError } = await supabase.from("documentation").insert({
        title: title.trim(),
        caption: caption.trim(),
        image_path: path,
      });

      if (insertError) {
        await supabase.storage.from(DOCUMENTATION_BUCKET).remove([path]);
        toast.error(`Gagal menyimpan dokumentasi: ${insertError.message}`);
        console.error("Insert documentation error:", insertError);
        return;
      }

      toast.success("Dokumentasi ditambahkan");
      reset();
      setOpen(false);
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengunggah gambar";
      toast.error(message);
      console.error("Add documentation error:", error);
    } finally {
      setBusy(false);
    }
  };

  const removeDoc = async (doc: Doc) => {
    const { error: deleteError } = await supabase
      .from("documentation")
      .delete()
      .eq("id", doc.id);

    if (deleteError) {
      toast.error("Gagal menghapus dokumentasi");
      console.error("Delete documentation error:", deleteError);
      return;
    }

    const { error: storageError } = await supabase.storage
      .from(DOCUMENTATION_BUCKET)
      .remove([doc.image_path]);

    if (storageError) {
      console.error("Delete documentation file error:", storageError);
    }

    toast.success("Dokumentasi dihapus");
    setDeleteDialogOpen(false);
    setPendingDeleteDoc(null);
    load();
  };

  return (
    <section className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dokumentasi Kelas</h2>
          <p className="text-sm text-muted-foreground">{docs.length} momen tersimpan</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 mr-1" /> Tambah Momen</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Upload Momen</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dtitle">Judul Momen</Label>
                  <Input id="dtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Praktik Lab Jaringan" maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dcap">Caption</Label>
                  <Textarea id="dcap" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Cerita di balik foto ini..." maxLength={500} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dimg">Foto</Label>
                  <Input id="dimg" ref={fileRef} type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
                  {preview && (
                    <img src={preview} alt="preview" className="w-full aspect-video object-cover rounded-md border mt-2" />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Batal</Button>
                <Button onClick={addDoc} disabled={busy}>{busy ? "Mengunggah..." : "Simpan"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Memuat...</p>
      ) : docs.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center bg-muted/30 animate-scale-in-soft">
          <ImagePlus className="size-10 mx-auto text-muted-foreground mb-3 animate-fade-up" />
          <p className="text-muted-foreground text-sm">Belum ada foto kenangan.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc, index) => (
            <article
              key={doc.id}
              className="bg-card border rounded-xl overflow-hidden group hover-lift animate-fade-up"
              style={{ animationDelay: `${Math.min(index * 55, 280)}ms` }}
            >
              <div className="relative aspect-video bg-muted overflow-hidden">
                <img src={publicUrl(doc.image_path)} alt={doc.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {isAdmin && (
                  <Button size="icon" variant="secondary" onClick={() => { setPendingDeleteDoc(doc); setDeleteDialogOpen(true); }} className="absolute top-2 right-2 size-8 shadow-sm" aria-label="Hapus">
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="p-4 space-y-1.5">
                <h3 className="font-semibold leading-tight">{doc.title}</h3>
                {doc.caption && <p className="text-sm text-muted-foreground line-clamp-2">{doc.caption}</p>}
                <p className="text-xs text-muted-foreground pt-1">
                  {format(new Date(doc.created_at), "dd MMMM yyyy", { locale: idLocale })}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dokumentasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Dokumentasi "{pendingDeleteDoc?.title}" akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDeleteDoc && removeDoc(pendingDeleteDoc)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
