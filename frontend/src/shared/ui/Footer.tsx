import { Mail, Send, Users } from 'lucide-react';

interface FooterProps {
  copyrightText?: string;
  contactEmail?: string;
  socialLinks?: {
    telegram?: string;
    vk?: string;
  };
  className?: string;
}

export function Footer({
  copyrightText = '© 2026 CourtVision Pro. All rights reserved.',
  contactEmail = 'hello@courtvision.pro',
  socialLinks = {
    telegram: 'https://t.me/courtvision',
    vk: 'https://vk.com/courtvision',
  },
  className = '',
}: FooterProps) {
  return (
    <footer className={`border-t border-[rgba(247,240,226,0.08)] bg-[rgba(6,8,11,0.78)] backdrop-blur-xl ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-400">
            {copyrightText}
          </p>

          <div className="flex items-center gap-2">
            <a
              href={socialLinks.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[rgba(247,240,226,0.08)] bg-[rgba(255,248,238,0.03)] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-[rgba(201,106,43,0.3)] hover:bg-[rgba(201,106,43,0.08)] hover:text-white"
              aria-label="Telegram"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Telegram</span>
            </a>

            <a
              href={socialLinks.vk}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-[rgba(247,240,226,0.08)] bg-[rgba(255,248,238,0.03)] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-[rgba(96,125,150,0.3)] hover:bg-[rgba(96,125,150,0.08)] hover:text-white"
              aria-label="VK"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">VK</span>
            </a>
            <div className="mx-1 h-6 w-px bg-[rgba(247,240,226,0.08)]" />
            <a
              href={`mailto:${contactEmail}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[rgba(247,240,226,0.08)] bg-[rgba(255,248,238,0.03)] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-[rgba(247,240,226,0.2)] hover:bg-[rgba(255,248,238,0.06)] hover:text-white"
            >
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{contactEmail}</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;