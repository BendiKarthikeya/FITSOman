import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Checkbox';
import { auth } from '@/lib/auth';

export const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize RTL/LTR on mount
  useEffect(() => {
    const currentLang = i18n.language;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loggedInUser = await auth.login(username, password);
      const role = loggedInUser?.role;
      const isAdminRole = role === 'admin' || role === 'superuser' || role === 'culture_admin';
      // Hard-navigate so the Router re-reads localStorage with the new user
      // (avoids any stale-state race when redirecting straight after login).
      window.location.href = isAdminRole ? '/admin/dashboard' : '/dashboard';
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Page — bg-slate-100, centered, 64px padding on all sides (Figma: 4:1185) */
    <div className="min-h-screen w-full bg-[#f1f5f9] flex items-center justify-center p-16">

      {/* Card — fixed 447px, 32px padding, 24px gap between every section (Figma: 4:1186) */}
      <div className="shrink-0 w-[447px] bg-white rounded-[8px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-8 flex flex-col gap-6 items-center">

        {/* Header — 24px horizontal inset, 8px gap between title and subtitle */}
        <div className="w-full px-6 flex flex-col items-center gap-2 text-center">
          <h1 className="text-[24px] leading-8 font-semibold text-[#0f172a]">{t('auth.welcomeBack')}</h1>
          <p className="text-[14px] leading-5 font-normal text-[#64748b]">{t('auth.loginDescription')}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Form — wraps email, password, checkbox, login button so Enter key submits */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">

          {/* Email/Username field */}
          <div className="w-full flex flex-col gap-3">
            <label htmlFor="username" className="text-[14px] leading-[1.5] font-medium text-[#0f172a]">
              {t('auth.emailOrUsername')}
            </label>
            <Input
              id="username"
              type="text"
              placeholder="demo"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="h-9 px-3 py-1 rounded-[8px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.10)] text-[14px] leading-[1.5]"
            />
          </div>

          {/* Password field — label row has Forgot password? on the right */}
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center justify-between w-full">
              <label htmlFor="password" className="text-[14px] leading-[1.5] font-medium text-[#0f172a]">
                {t('auth.password')}
              </label>
              <a href="#" className="text-[14px] leading-[1.5] font-medium text-[#0f172a] hover:underline">
                {t('auth.forgotPassword')}
              </a>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="**************"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-9 px-3 py-1 rounded-[8px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.10)] text-[14px] leading-[1.5]"
            />
          </div>

          {/* Remember Me — 8px gap between checkbox and label */}
          <div className="w-full flex items-center gap-2">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <label htmlFor="remember-me" className="text-[14px] font-medium leading-[1.2] text-[#0f172a] cursor-pointer select-none">
              {t('auth.rememberMe')}
            </label>
          </div>

          {/* Login button — 36px height, 16px/8px padding, 10px radius */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full h-9 px-4 py-2 text-[14px] leading-[1.5] font-medium rounded-[10px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.10)] bg-[#0f172a] text-[#f1f5f9]"
            disabled={loading}
          >
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </Button>

        </form>

        {/* Divider — 8px text side padding, text block 138px wide */}
        <div className="w-full flex items-center">
          <div className="flex-1 h-px bg-[#e2e8f0]" />
          <div className="px-2 w-[138px] flex justify-center shrink-0">
            <span className="text-[12px] leading-4 text-[#64748b] uppercase">{t('auth.orContinueWith')}</span>
          </div>
          <div className="flex-1 h-px bg-[#e2e8f0]" />
        </div>

        {/* Social buttons — 16px gap, each 36px height, 8px radius */}
        <div className="w-full flex gap-4">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="flex-1 h-9 px-3 py-2 rounded-[8px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.10)] flex items-center justify-center gap-2 bg-white"
            onClick={() => { window.location.href = '/api/auth/sso/google'; }}
          >
            {/* Google */}
            <svg className="w-4 h-4" viewBox="0 0 18 18" aria-hidden="true" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            <span className="text-[13px] font-medium text-slate-700">Google</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="flex-1 h-9 px-3 py-2 rounded-[8px] border border-[#e2e8f0] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.10)] flex items-center justify-center gap-2 bg-white"
            onClick={() => { window.location.href = '/api/auth/sso/microsoft'; }}
          >
            {/* Microsoft */}
            <svg className="w-4 h-4" viewBox="0 0 21 21" aria-hidden="true" fill="none">
              <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
              <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            <span className="text-[13px] font-medium text-slate-700">Microsoft</span>
          </Button>
        </div>

        {/* Bottom link */}
        <p className="text-[14px] leading-[1.5] text-[#64748b] text-center">
          {t('auth.dontHaveAccount')}{' '}
          <a href="#" className="font-medium underline text-[#64748b] hover:text-[#0f172a]">
            {t('auth.signUp')}
          </a>
        </p>

      </div>
    </div>
  );
};
