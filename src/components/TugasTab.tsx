import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/async";
import { toast } from "sonner";

const TASK_PHOTO_BUCKET = "documentation";

const createStoragePath = (fileName: string) => {
  const extension = fileName.split(".").pop() || "jpg";
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${randomPart}.${extension}`;
};

type Task = {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  created_at: string;
  photo_paths: string[];
};

type Props = {
  role: string | null;
};

export const TugasTab = ({ role }: Props) => {
  const isAdmin = role === "admin";
  const loadIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setFiles([]);
    setPreviews([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadPhotos = async (files: File[]) => {
    const photoPaths: string[] = [];

    for (const file of files) {
      const path = createStoragePath(file.name);
      const { error: uploadError } = await supabase.storage
        .from(TASK_PHOTO_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        toast.error(`Gagal mengunggah gambar: ${uploadError.message}`);
        console.error("Upload task photo error:", uploadError);
        for (const uploadedPath of photoPaths) {
          await supabase.storage.from(TASK_PHOTO_BUCKET).remove([uploadedPath]);
        }
        return null;
      }

      photoPaths.push(path);
    }

    return photoPaths;
  };

  const load = useCallback(async (showLoading = true) => {
    const loadId = ++loadIdRef.current;

    if (showLoading || !hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      const { data, error } = await withTimeout(
        supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false }),
        "Memuat tugas terlalu lama. Coba refresh halaman."
      );

      if (loadId !== loadIdRef.current) return;

      if (error) {
        toast.error(`Gagal memuat tugas: ${error.message}`);
        console.error("Load tasks error:", error);
        return;
      }

      setTasks(data ?? []);
      hasLoadedRef.current = true;
    } catch (error) {
      if (loadId !== loadIdRef.current) return;

      const message = error instanceof Error ? error.message : "Gagal memuat tugas";
      toast.error(message);
      console.error("Load tasks error:", error);
    } finally {
      if (loadId === loadIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const addTask = async () => {
    if (!title.trim()) return toast.error("Judul tugas wajib diisi");

    let photoPaths: string[] = [];
    if (files.length > 0) {
      const uploaded = await uploadPhotos(files);
      if (!uploaded) return;
      photoPaths = uploaded;
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
    };

    if (photoPaths.length > 0) {
      payload.photo_paths = photoPaths;
    }

    const { error } = await supabase.from("tasks").insert(payload as any);

    if (error) {
      const message =
        error.code === "42703"
          ? "Database belum punya kolom photo_paths. Jalankan migrasi supabase untuk mendukung foto tugas."
          : error.message || "Gagal menambahkan tugas";
      toast.error(message);
      console.error("Add task error:", error);
      if (photoPaths.length > 0) {
        for (const uploadedPath of photoPaths) {
          await supabase.storage.from(TASK_PHOTO_BUCKET).remove([uploadedPath]);
        }
      }
      return;
    }

    toast.success("Tugas ditambahkan");
    reset();
    setOpen(false);
    load();
  };

  const removeTask = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      toast.error("Gagal menghapus tugas");
      console.error("Delete task error:", error);
      return;
    }

    toast.success("Tugas dihapus");
    load();
  };

  const isOverdue = (d: string | null) =>
    !!d && new Date(d) < new Date();

  return (
    <section className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="animate-fade-in">
          <h2 className="text-2xl font-semibold tracking-tight animate-fade-up">
            Daftar Tugas
          </h2>
          <p className="text-sm text-muted-foreground animate-fade-up animate-delay-1">
            {tasks.length} tugas tersimpan
          </p>
        </div>

        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="hover-lift animate-bounce-in">
                <Plus className="size-4 mr-1" /> Tambah Tugas
              </Button>
            </DialogTrigger>

            <DialogContent className="animate-scale-in-soft">
              <DialogHeader>
                <DialogTitle className="animate-fade-in">Tugas Baru</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 animate-fade-up">
                <div>
                  <Label>Judul</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Deadline</Label>
                  <Input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Foto Tugas (maks 10)</Label>
                  <Input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const selectedFiles = e.target.files;
                      if (!selectedFiles) return;

                      const fileArray = Array.from(selectedFiles).slice(0, 10);
                      const invalid = fileArray.find((file) => file.size > 5 * 1024 * 1024);
                      if (invalid) {
                        toast.error("Ukuran gambar maksimal 5MB per file");
                        setFiles([]);
                        setPreviews([]);
                        if (fileRef.current) fileRef.current.value = "";
                        return;
                      }

                      setFiles(fileArray);
                      setPreviews(fileArray.map((file) => URL.createObjectURL(file)));
                    }}
                  />
                  {previews.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {previews.map((preview, index) => (
                        <img
                          key={preview}
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-md border"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button onClick={addTask}>Simpan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Memuat...</p>
      ) : tasks.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center bg-muted/30 animate-scale-in-soft">
          <FileText className="size-10 mx-auto mb-3 animate-fade-up" />
          <p className="text-muted-foreground text-sm">
            Belum ada tugas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task, index) => (
            <article
              key={task.id}
              className="bg-card border rounded-xl overflow-hidden hover-lift animate-fade-up"
              style={{ animationDelay: `${Math.min(index * 55, 280)}ms` }}
            >
              {task.photo_paths?.[0] && (
                <div className="bg-muted overflow-hidden">
                  <img
                    src={supabase.storage.from(TASK_PHOTO_BUCKET).getPublicUrl(task.photo_paths[0]).data.publicUrl}
                    alt={task.title}
                    className="w-full h-44 object-cover"
                  />
                </div>
              )}
              <div className="p-5 flex flex-col gap-3">
                <div className="flex justify-between">
                  <h3 className="font-semibold">{task.title}</h3>

                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeTask(task.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {task.description}
                </p>

                <div className="text-xs flex justify-between mt-auto">
                  <span>
                    {format(new Date(task.created_at), "dd MMM", {
                      locale: idLocale,
                    })}
                  </span>

                  {task.deadline && (
                    <span
                      className={
                        isOverdue(task.deadline)
                          ? "text-red-500"
                          : ""
                      }
                    >
                      {format(new Date(task.deadline), "dd MMM HH:mm", {
                        locale: idLocale,
                      })}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
