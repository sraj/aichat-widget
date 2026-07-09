

/**
 * Skeleton loader for message bubbles
 */
export function MessageSkeleton() {
  return (
    <div class="flex justify-start animate-pulse">
      <div class="max-w-[80%] rounded-lg rounded-bl-none p-3 bg-gray-200">
        <div class="space-y-2">
          <div class="h-4 bg-gray-300 rounded w-48"></div>
          <div class="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Multiple message skeletons
 */
export function MessageListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div class="flex-1 p-4 space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <MessageSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Typing indicator (three dots animation)
 */
export function TypingIndicator() {
  return (
    <div class="flex justify-start">
      <div
        class="max-w-[80%] rounded-lg rounded-bl-none p-3 bg-gray-200 flex items-center gap-1"
      >
        <div class="flex gap-1">
          <div
            class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          ></div>
          <div
            class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms', animationDuration: '1s' }}
          ></div>
          <div
            class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms', animationDuration: '1s' }}
          ></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Connection status skeleton
 */
export function ConnectionSkeleton() {
  return (
    <div class="animate-pulse flex items-center gap-2">
      <div class="w-2 h-2 bg-gray-300 rounded-full"></div>
      <div class="h-3 bg-gray-300 rounded w-20"></div>
    </div>
  );
}
