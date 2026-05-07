import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PROFILE_PHOTO_BUCKET = "profiles";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [absen, setAbsen] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const loadProfile = async () => {
      try {
        const nisn = user.email?.split("@")[0];
        const { data } = await supabase
          .from("students")
          .select("*")
          .eq("nisn", nisn)
          .single();

        if (data) {
          setName(data.name || "");
          setAbsen(data.absen || "");
          setPhone(data.phone || "");
          if (data.profile_photo_path) {
            const { data: urlData } = supabase.storage
              .from("profiles")
              .getPublicUrl(data.profile_photo_path);
            setPhotoPreview(urlData?.publicUrl || "");
          }
        }
      } catch (error) {
        console.error("Load profile error:", error);
      }
    };

    loadProfile();
    document.title = "Edit Profil · X-TJKT 2";
  }, [user, navigate]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !absen.trim() || !phone.trim()) {
      return toast.error("Semua field wajib diisi");
    }

    if (!user) return;

    setLoading(true);
    try {
      const nisn = user.email?.split("@")[0];
      const updates: { name: string; absen: string; phone: string; profile_photo_path?: string } = {
        name,
        absen,
        phone,
      };

      // Upload foto profil jika ada file baru
      if (profilePhoto) {
        const fileName = `profile-${user.id}-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(PROFILE_PHOTO_BUCKET)
          .upload(`photos/${fileName}`, profilePhoto);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(uploadError.message || "Gagal upload foto profil");
          return;
        }

        updates.profile_photo_path = uploadData?.path ?? `photos/${fileName}`;
      }

      // Update student record
      const { error } = await supabase
        .from("students")
        .update(updates)
        .eq("nisn", nisn);

      if (error) {
        console.error("Update error:", error);
        toast.error("Gagal memperbarui profil");
        return;
      }

      toast.success("Profil berhasil diperbarui");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b animate-fade-up">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Edit Profil</h1>
          <p className="text-sm text-muted-foreground">Perbarui informasi pribadi Anda</p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Lengkap</Label>
            <Input
              id="name"
              placeholder="Masukkan nama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="absen">Nomor Absen</Label>
            <Input
              id="absen"
              placeholder="Masukkan nomor absen"
              value={absen}
              onChange={(e) => setAbsen(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="phone">Nomor WhatsApp</Label>
            <Input
              id="phone"
              placeholder="Masukkan nomor WhatsApp"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="photo">Foto Profil</Label>
            <div className="mt-2 space-y-2">
              {photoPreview && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={loading}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !name || !absen || !phone}
          className="w-full"
        >
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </main>
    </div>
  );
};

export default EditProfile;
