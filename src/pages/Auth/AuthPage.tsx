
import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/supabase/AuthProvider';
import AuthLayout from '@/components/Auth/AuthLayout';
import SignInForm from '@/components/Auth/SignInForm';
import SignUpForm from '@/components/Auth/SignUpForm';
import ResetPasswordForm from '@/components/Auth/ResetPasswordForm';
import UpdatePasswordForm from '@/components/Auth/UpdatePasswordForm';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'sign-in';
  const { user, isLoading } = useAuth();
  const [verifyMode, setVerifyMode] = useState<string | null>(null);

  // Check if this is a password reset flow
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setVerifyMode('recovery');
    }
  }, []);

  // If user is already logged in, redirect to home
  if (user && !isLoading) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {verifyMode === 'recovery' ? (
        <UpdatePasswordForm />
      ) : mode === 'sign-up' ? (
        <SignUpForm />
      ) : mode === 'reset-password' ? (
        <ResetPasswordForm />
      ) : (
        <SignInForm />
      )}
    </AuthLayout>
  );
}
