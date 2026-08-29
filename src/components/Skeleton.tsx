/**
 * Skeleton.tsx — Reusable loading skeleton (Preact)
 * Animated pulse placeholders for data fetch states
 */
export function SkeletonLine({ w = '100%', h = '1rem', cls = '' }: { w?: string; h?: string; cls?: string }) {
  return <div class={`animate-pulse bg-white/10 rounded ${cls}`} style={{ width: w, height: h }}></div>;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div class="p-4 space-y-3">
      <SkeletonLine w="40%" h="1.25rem" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} w={i === lines - 1 ? '70%' : '100%'} h="0.875rem" />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div class="space-y-2 p-4">
      <SkeletonLine w="100%" h="2.5rem" cls="rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} class="flex gap-4 items-center">
          <SkeletonLine w="60px" h="1.5rem" cls="rounded" />
          <SkeletonLine w="40%" h="1rem" />
          <SkeletonLine w="80px" h="1.5rem" cls="rounded-full" />
          <SkeletonLine w="30%" h="1rem" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div class="space-y-4 p-4">
      <div class="flex gap-3 items-start">
        <div class="w-10 h-10 rounded-full animate-pulse bg-white/10"></div>
        <div class="space-y-2 flex-1">
          <SkeletonLine w="30%" h="0.75rem" />
          <SkeletonLine w="80%" h="0.875rem" />
          <SkeletonLine w="60%" h="0.875rem" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div class="space-y-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>
          <SkeletonLine w="30%" h="0.75rem" cls="mb-2" />
          <SkeletonLine w="100%" h="2.5rem" cls="rounded-lg" />
        </div>
      ))}
    </div>
  );
}
