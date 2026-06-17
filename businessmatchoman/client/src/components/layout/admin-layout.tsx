import { ReactNode } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { useTranslation } from "react-i18next";
import { useRTL } from "@/hooks/use-rtl";
import {
  Settings,
  Home,
  Users,
  Store,
  FileCheck,
  Image,
  Folder,
  Shield,
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const { isRtl, rtlClass } = useRTL();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-primary/10 flex-shrink-0 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-primary/10">
          <Link href="/admin">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h1 className={`text-xl font-bold text-primary ${isRtl ? 'font-arabic' : ''}`}>{t('admin.layout.adminPanel')}</h1>
            </div>
          </Link>
        </div>
        <nav className="p-4">
          <ul className="space-y-1">
            <li>
              <Link
                href="/admin"
                className="flex items-center px-4 py-3 text-foreground rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
              >
                <Home className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" />
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.layout.dashboard')}</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/users"
                className="flex items-center px-4 py-3 text-foreground rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
              >
                <Users className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" />
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.layout.users')}</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/listings"
                className="flex items-center px-4 py-3 text-foreground rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
              >
                <Store className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" />
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.layout.listings')}</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/kyc"
                className="flex items-center px-4 py-3 text-foreground rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
              >
                <Shield className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" />
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.layout.kycVerification')}</span>
              </Link>
            </li>

            <li>
              <Link
                href="/admin/settings"
                className="flex items-center px-4 py-3 text-foreground rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
              >
                <Settings className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" />
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.layout.settings')}</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/image-settings"
                className="flex items-center px-4 py-3 text-foreground rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
              >
                <Image className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" />
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.layout.imageSettings')}</span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/file-explorer"
                className="flex items-center px-4 py-3 text-foreground rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
              >
                <Folder className="w-5 h-5 mr-3 text-muted-foreground group-hover:text-primary" />
                <span className={`font-medium ${isRtl ? 'font-arabic' : ''}`}>{t('admin.layout.fileExplorer')}</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 overflow-auto bg-neutral-50 min-w-0">{children}</main>
    </div>
  );
}
