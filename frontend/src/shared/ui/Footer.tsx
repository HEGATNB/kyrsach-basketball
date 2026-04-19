// shared/ui/Footer.tsx
import { Mail, Check } from 'lucide-react';
import { useState } from 'react';

// ✅ Правильная SVG иконка Telegram
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.26.26-.54.26l.188-2.74 4.99-4.51c.217-.194-.047-.302-.335-.108l-6.17 3.89-2.66-.83c-.578-.18-.59-.578.124-.858l10.4-4.01c.48-.18.9.11.75.85z"/>
  </svg>
);

// ✅ Правильная SVG иконка VK (логотип ВКонтакте)
const VKIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 48 48"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm-2.65 28.3c-1.13 0-2.05-.4-2.75-1.2-.7-.8-1.05-1.8-1.05-3 0-.8.1-1.6.3-2.4.2-.8.5-1.5.8-2.1.3-.6.6-1 .8-1.3.2-.3.2-.5 0-.6-.1-.1-.3 0-.7.4-.4.4-.8 1-1.1 1.8-.3.8-.5 1.6-.5 2.4 0 1.5.4 2.7 1.1 3.6.7.9 1.6 1.4 2.7 1.4.5 0 .9-.2 1.2-.5.3-.3.5-.8.5-1.3 0-1-.2-2.1-.7-3.3l-.6-1.6c-.2-.6-.3-1.1-.3-1.6 0-1.1.4-1.6 1.1-1.6.4 0 .7.2 1.1.5.4.3.7.8 1 1.5.3.7.4 1.4.4 2.2 0 1.4-.3 2.5-1 3.4-.7.9-1.5 1.4-2.6 1.4zm9.15-1.1c-.2.7-.5 1.2-.9 1.5-.4.3-.8.5-1.2.5-.4 0-.8-.2-1.1-.5-.3-.3-.5-.8-.5-1.3 0-.5.1-1 .4-1.5.3-.5.6-.9 1-1.1.4-.2.8-.3 1.1-.3.4 0 .7.1 1 .3.3.2.5.5.6.9.1.4.2.8.2 1.2 0 .4-.1.8-.2 1.1l.1.2z"/>
  </svg>
);

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
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy email:', error);
    }
  };

  return (
    <footer className={`border-t border-[var(--border-soft)] bg-[rgba(10,8,6,0.78)] backdrop-blur-2xl ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Копирайт */}
          <p className="text-sm text-[var(--text-soft)]">
            {copyrightText}
          </p>

          {/* Социальные сети и email */}
          <div className="flex items-center gap-4">
            {/* Подписывайтесь на нас */}
            <span className="text-sm text-[var(--text-muted)]">
              Подписывайтесь на нас
            </span>

            {/* Telegram - только иконка без рамки */}
            <a
              href={socialLinks.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[var(--text-muted)] transition hover:text-[#26A5E4]"
              aria-label="Telegram"
            >
              <TelegramIcon className="h-6 w-6" />
            </a>

            {/* VK - только иконка без рамки */}
            <a
              href={socialLinks.vk}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-[var(--text-muted)] transition hover:text-[#0077FF]"
              aria-label="VK"
            >
              <VKIcon className="h-6 w-6" />
            </a>

            {/* Разделитель */}
            <div className="mx-1 h-6 w-px bg-[var(--border-soft)]" />

            {/* Email с копированием в буфер */}
            <button
              onClick={handleCopyEmail}
              className="relative flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[rgba(255,246,229,0.03)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition hover:border-[rgba(232,161,67,0.22)] hover:bg-[rgba(232,161,67,0.08)] hover:text-[var(--accent-soft)]"
              aria-label="Copy email to clipboard"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">{contactEmail}</span>
                  <span className="sm:hidden">Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;