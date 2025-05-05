
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/supabase/AuthProvider';

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?mode=sign-in" replace />;
  }

  return <Outlet />;
}
