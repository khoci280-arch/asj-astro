// ==========================================
// TESTS: cloudinary uploadMany (design pass 2026-09-05) — shared
// iterate → Cloudinary → collect-URLs loop used by MasterFullForm,
// AiCvForm, and SiswaBaruForm. The uploader is injectable (default =
// uploadToCloudinary) so behavior is testable without network.
// Behavior byte-identical to the inline loops they replaced: skip missing
// files, stop at first error with the original message + failing file key.
// ==========================================
import { describe, it, expect, vi } from "vitest";
import { uploadMany, UploadCollectionError } from "./cloudinary";

const f1 = new File(["a"], "photo.jpg", { type: "image/jpeg" });
const f2 = new File(["b"], "jft.pdf", { type: "application/pdf" });

describe("uploadMany (loops Master/AiCv/Siswa → satu helper)", () => {
  it("file yang tidak ada dilewati → {} tanpa upload", async () => {
    const upload = vi.fn(async (f: File) => "https://c/" + f.name);
    const urls = await uploadMany({}, { ktp: "ktp", kk: "kk" }, upload);
    expect(urls).toEqual({});
    expect(upload).not.toHaveBeenCalled();
  });

  it("upload tiap file yang ada, URL dikumpulkan dgn payload-key (bukan file-key)", async () => {
    const upload = vi.fn(async (f: File) => "https://c/" + f.name);
    const urls = await uploadMany({ photo: f1, jft: f2, ssw: null }, { photo: "photoFile", jft: "jftFile", ssw: "sswFile" }, upload);
    expect(urls).toEqual({ photoFile: "https://c/photo.jpg", jftFile: "https://c/jft.pdf" });
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload).toHaveBeenNthCalledWith(1, f1);
    expect(upload).toHaveBeenNthCalledWith(2, f2);
  });

  it("error pertama → UploadCollectionError dgn key file + message asli; upload berhenti", async () => {
    const upload = vi.fn(async (f: File) => {
      if (f === f2) throw new Error("Upload Cloudinary gagal (HTTP 500): boom");
      return "https://c/" + f.name;
    });
    const err = await uploadMany({ a: f1, b: f2, c: f2 }, { a: "aFile", b: "bFile", c: "cFile" }, upload).then(() => null, (e: unknown) => e);
    expect(err).toBeInstanceOf(UploadCollectionError);
    expect((err as UploadCollectionError).key).toBe("b");
    expect((err as Error).message).toBe("Upload Cloudinary gagal (HTTP 500): boom");
    expect(upload).toHaveBeenCalledTimes(2); // c tidak dicoba
  });

  it("map identitas (SISWA_FILE_COLUMNS): payload key == file key", async () => {
    const upload = vi.fn(async (f: File) => "https://c/" + f.name);
    const urls = await uploadMany({ ktp: f1, kk: null, ijazah: f2 }, { ktp: "ktp", kk: "kk", ijazah: "ijazah" }, upload);
    expect(urls).toEqual({ ktp: "https://c/photo.jpg", ijazah: "https://c/jft.pdf" });
  });
});

