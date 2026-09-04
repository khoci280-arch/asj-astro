// ==========================================
// TESTS: C6 upload-URL allow-list enforcement (2026-09-04 pass)
//
// Every client-supplied document URL must pass
// _lib/storage.isAllowedDocumentUrl (https-only + storage-host allow-list)
// before it is stored or downloaded. Unit coverage of the validator itself
// lives in _lib/storage.test.ts; this file pins the handler-level gates:
//   - documents: public apply, berkas-tahapan and revisi upload reject bad
//     URLs before any DB write; the revisi handler is also scoped to the
//     session WA (a kandidat may only attach a revisi to their own WA).
//   - ingestion: processUploadDoc downloads only allow-listed https URLs
//     (no arbitrary https host / internal-network SSRF).
// Every rejection below happens BEFORE any DB/network call, so the suite runs
// without env.
// ==========================================
import { describe, it, expect } from 'vitest';
import { signToken } from '../_lib/session';
import {
  handleSubmitApply,
  handleSimpanBerkasTahapan,
  handleSimpanRevisiKandidat,
} from './documents/service';
import { handleProcessUploadDoc } from './ingestion/service';

const admin = signToken({ role: 'admin', name: 'AGUS' });
const kandidatA = signToken({ role: 'kandidat', wa: '6281111111111' });

// Handler results are legacy unions of success/error shapes — tests read a
// few fields off them, so treat the answers as records.
const asRecord = (p: Promise<unknown>): Promise<Record<string, any>> => p as Promise<Record<string, any>>;

describe('documents — client-supplied document URLs must be https from allow-listed hosts (C6)', () => {
  it('public apply rejects a bad file URL before any job/DB lookup', async () => {
    const res = await asRecord(
      handleSubmitApply([{ wa: '6281111111111', job: 'ENG-01', nama: 'BUDI', cvFile: 'http://evil.example.com/cv.pdf' }]),
    );
    expect(res.success).toBe(false);
    expect(String(res.message)).toContain('URL dokumen tidak valid');
  });

  it('berkas-tahapan upload rejects a bad direct URL (admin session, pre-DB)', async () => {
    const res = await asRecord(
      handleSimpanBerkasTahapan([{ wa: '6281111111111', jenisBerkas: 'KTP', fileUrl: 'https://evil.example.com/ktp.pdf' }], admin),
    );
    expect(res.success).toBe(false);
    expect(String(res.error)).toContain('URL dokumen tidak valid');
  });

  it('revisi upload is scoped to the session WA and rejects bad hosts', async () => {
    const wrongWa = await asRecord(
      handleSimpanRevisiKandidat(['6289999999999', { url: 'https://res.cloudinary.com/x/cv.pdf', name: 'cv.pdf' }], kandidatA),
    );
    expect(wrongWa.success).toBe(false);
    expect(String(wrongWa.error)).toContain('Akses ditolak');
    const badHost = await asRecord(
      handleSimpanRevisiKandidat(['6281111111111', { url: 'https://evil.example.com/cv.pdf', name: 'cv.pdf' }], kandidatA),
    );
    expect(badHost.success).toBe(false);
    expect(String(badHost.error)).toContain('URL dokumen tidak valid');
  });
});

describe('ingestion — processUploadDoc downloads only allow-listed https URLs (C6)', () => {
  it('rejects an http:// scheme before any network call', async () => {
    const res = await asRecord(
      handleProcessUploadDoc([{ fileUrl: 'http://res.cloudinary.com/cv.pdf', fileType: 'pdf' }], admin),
    );
    expect(res.success).toBe(false);
    expect(String(res.error)).toContain('fileUrl harus https');
  });

  it('rejects https URLs from hosts outside the allow-list', async () => {
    const res = await asRecord(
      handleProcessUploadDoc([{ fileUrl: 'https://evil.example.com/cv.pdf', fileType: 'pdf', wa: '6281111111111' }], kandidatA),
    );
    expect(res.success).toBe(false);
    expect(String(res.error)).toContain('fileUrl harus https');
  });
});
