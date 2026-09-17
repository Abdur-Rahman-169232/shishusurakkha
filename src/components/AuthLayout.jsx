import { Activity } from "lucide-react";

function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Activity className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">{children}</div>
        {footer ? <p className="mt-4 text-center text-sm text-muted-foreground">{footer}</p> : null}
      </div>
    </div>
  );
}

export default AuthLayout;
