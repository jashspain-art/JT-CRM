interface Props {
  message?: string
}

export function LoadingSpinner({ message = 'Loading...' }: Props) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({ message = 'No records found', action, actionLabel }: { message?: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-400 text-sm mb-3">{message}</p>
      {action && (
        <button onClick={action} className="text-sm text-blue-600 hover:text-blue-800 font-medium">{actionLabel}</button>
      )}
    </div>
  );
}
