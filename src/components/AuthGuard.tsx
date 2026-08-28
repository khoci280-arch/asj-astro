/**
 * AuthGuard.tsx — Client-side route protection
 * Per PDF Fase 8: "Implement client-side route protection"
 *
 * Wraps protected content — redirects to login if no valid session.
 */
import { useStore } from '@nanostores/preact';
import { authStore } from '../store/authReactive';
import { ComponentChildren } from 'preact';

interface Props {
  children: ComponentChildren;
  requiredRole?: 'admin' | 'kandidat';
  redirectTo?: string;
}

export default function AuthGuard({ children, requiredRole, redirectTo = '/' }: Props) {
  const  = useStore(authStore);

  // Not logged in → redirect
  if (!.isLoggedIn) {
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
    return (
      <div class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <i class="fas fa-lock text-4xl text-slate-500 mb-4"></i>
          <p class="text-slate-400">Mengalihkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  // Wrong role → redirect
  if (requiredRole && .role !== requiredRole) {
    if (typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
    return (
      <div class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <i class="fas fa-ban text-4xl text-red-500 mb-4"></i>
          <p class="text-slate-400">Akses ditolak. Mengalihkan...</p>
        </div>
      </div>
    );
  }

  // Authorized → render children
  return <>{children}</>;
}
