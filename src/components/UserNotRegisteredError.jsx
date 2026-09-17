import { ShieldAlert } from "lucide-react";

function UserNotRegisteredError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Access restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is authenticated but is not registered for ShishuSurakkha. An administrator must invite you to this app before you can view child records.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-foreground">
          <li>Confirm you signed in with the Health Assistant email used for EPI access.</li>
          <li>Ask your upazila EPI supervisor to add you as a user in the Base44 app settings.</li>
          <li>Sign out, then sign in again after you receive the invitation.</li>
        </ol>
        <p className="mt-4 text-sm text-muted-foreground">
          If you need help, contact your district EPI administrator or the ShishuSurakkha support desk.
        </p>
      </div>
    </div>
  );
}

export default UserNotRegisteredError;
