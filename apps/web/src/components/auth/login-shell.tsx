import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BrandWordmark } from "@/components/brand-wordmark";

type LoginShellProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function LoginShell({ children, footer }: LoginShellProps) {
  return (
    <div className="min-h-screen bg-imperial-blue-950 flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-imperial-blue shadow-2xl ring-1 ring-black/20 flex flex-col sm:flex-row">
        <div className="relative h-44 sm:h-auto sm:min-h-[480px] sm:w-[42%] shrink-0 overflow-hidden">
          <img
            src="/login-hero.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>

        <div className="flex flex-1 flex-col bg-imperial-blue text-imperial-blue-50">
          <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-8 lg:px-10">
            <div className="mb-8 space-y-4">
              <div className="flex items-center gap-1">
                <img
                  src="/logo.png"
                  alt=""
                  width={56}
                  height={56}
                  className="object-contain shrink-0"
                />
                <BrandWordmark size="lg" className="text-white" accentClassName="text-steel-azure-200" />
              </div>
              <p className="text-sm text-imperial-blue-100 leading-relaxed">
                Your time. Understood by <span className="text-steel-azure-200 font-medium">AI</span>.
              </p>
            </div>

            {children}

            {footer ? <div className="mt-8">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthFormLink({
  prompt,
  linkText,
  to,
}: {
  prompt: string;
  linkText: string;
  to: string;
}) {
  return (
    <p className="text-center text-sm text-imperial-blue-100">
      {prompt}{" "}
      <Link to={to} className="font-medium text-gold hover:text-school-bus-yellow transition-colors">
        {linkText}
      </Link>
    </p>
  );
}
