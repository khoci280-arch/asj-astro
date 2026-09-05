// ==========================================
// TESTS: applyDocs (C01/A4, 2026-09-05) — required upload cards derived
// from the SERVER job dokumenShare (getAppData public payload), replacing
// the hardcoded two-code JOB_PARAMS table.
// ==========================================
import { describe, it, expect } from "vitest";
import { requiredDocsFromJob, DEFAULT_REQUIRED } from "./applyDocs";

describe("requiredDocsFromJob (A4 — kartu wajib dari server)", () => {
  it("job tanpa dokumenShare → default CV/JFT/SSW (parity backend gate)", () => {
    expect(requiredDocsFromJob(null)).toEqual(["cv", "jft", "ssw"].map(k => ({ key: k, token: k.toUpperCase(), core: true })));
    expect(requiredDocsFromJob({})).toEqual(["cv", "jft", "ssw"].map(k => ({ key: k, token: k.toUpperCase(), core: true })));
    expect(requiredDocsFromJob({ dokumenShare: "" })).toEqual(["cv", "jft", "ssw"].map(k => ({ key: k, token: k.toUpperCase(), core: true })));
    expect(requiredDocsFromJob({ dokumenShare: "-" })).toEqual(["cv", "jft", "ssw"].map(k => ({ key: k, token: k.toUpperCase(), core: true })));
  });

  it("CV,JFT,SSW eksplisit → kartu inti saja", () => {
    const specs = requiredDocsFromJob({ dokumenShare: "CV,JFT,SSW" });
    expect(specs).toEqual(["cv", "jft", "ssw"].map(k => ({ key: k, token: k.toUpperCase(), core: true })));
  });

  it("dokumen tambahan (KTP) → kartu extra non-core (dikirim via extraFiles)", () => {
    const specs = requiredDocsFromJob({ dokumenShare: "CV,JFT,SSW,KTP" });
    expect(specs.map(s => s.key)).toEqual(["cv", "jft", "ssw", "extra_KTP"]);
    expect(specs[3]).toEqual({ key: "extra_KTP", token: "KTP", core: false });
  });

  it("token dinormalisasi (lowercase/spasi) dan dedupe", () => {
    const specs = requiredDocsFromJob({ dokumenShare: "cv, jft ,CV,sim a" });
    expect(specs.map(s => s.key)).toEqual(["cv", "jft", "extra_SIM_A"]);
    expect(specs[2].token).toBe("SIM A");
  });

  it("PAS PHOTO / FOTO alias → dilewati (kartu foto selalu dirender form)", () => {
    const specs = requiredDocsFromJob({ dokumenShare: "PAS PHOTO,CV,PASFOTO" });
    expect(specs.map(s => s.key)).toEqual(["cv"]);
  });

  it("ALL → default CV/JFT/SSW (form tidak bisa enumerasi dokumen bebas)", () => {
    const specs = requiredDocsFromJob({ dokumenShare: "ALL" });
    expect(specs).toEqual(["cv", "jft", "ssw"].map(k => ({ key: k, token: k.toUpperCase(), core: true })));
  });

  it("token aneh dengan spasi → key aman utk uploads map (underscore)", () => {
    const specs = requiredDocsFromJob({ dokumenShare: "SURAT SEHAT PUSKESMAS" });
    expect(specs.map(s => s.key)).toEqual(["extra_SURAT_SEHAT_PUSKESMAS"]);
    expect(specs[0].token).toBe("SURAT SEHAT PUSKESMAS");
  });

  it("DEFAULT_REQUIRED == CV/JFT/SSW (backup gate server handleSubmitApply)", () => {
    expect([...DEFAULT_REQUIRED]).toEqual(["CV", "JFT", "SSW"]);
  });
});

