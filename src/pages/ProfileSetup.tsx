import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PROFILE_PHOTO_BUCKET = "profiles";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [absen, setAbsen] = useState("");
  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
    document.title = "Lengkapi Profil · X-TJKT 2";
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
    if (!name.trim() || !absen.trim() || !phone.trim() || !profilePhoto) {
      return toast.error("Semua field wajib diisi");
    }

    if (!user) return;

    setLoading(true);
    try {
      let photoPath = "";
      
      // Upload foto profil
      const fileName = `profile-${user.id}-${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(PROFILE_PHOTO_BUCKET)
        .upload(`photos/${fileName}`, profilePhoto);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error(uploadError.message || "Gagal upload foto profil");
        return;
      }

      photoPath = uploadData?.path ?? `photos/${fileName}`;

      // Update atau create student record
      const { data: existingStudent } = await supabase
        .from("students")
        .select("id")
        .eq("nisn", user.email?.split("@")[0])
        .single();

      if (existingStudent) {
        const { error } = await supabase
          .from("students")
          .update({
            name,
            absen,
            phone,
            profile_photo_path: photoPath,
            is_profile_complete: true,
          })
          .eq("id", existingStudent.id);

        if (error) {
          console.error("Update error:", error);
          toast.error("Gagal memperbarui profil");
          return;
        }
      } else {
        const { error } = await supabase.from("students").insert({
          nisn: user.email?.split("@")[0],
          name,
          absen,
          phone,
          profile_photo_path: photoPath,
          is_profile_complete: true,
        });

        if (error) {
          console.error("Insert error:", error);
          toast.error("Gagal membuat profil");
          return;
        }
      }

      toast.success("Profil berhasil disimpan");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Error:", error);
      toast.error("Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background grid place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm animate-scale-in-soft">
          <div className="relative p-6 sm:p-7 space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Lengkapi Profil</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Silakan isi data diri Anda untuk melanjutkan
              </p>
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
              disabled={loading || !name || !absen || !phone || !profilePhoto}
              className="w-full"
            >
              {loading ? "Menyimpan..." : "Simpan Profil"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Data ini penting untuk administrasi kelas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
