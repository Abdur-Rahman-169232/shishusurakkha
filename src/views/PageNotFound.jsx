"use client";

import Link from "next/link";
import { Baby } from "lucide-react";
import Button from "@/components/ui/button";

function PageNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <Baby className="mb-4 h-12 w-12 text-primary" />
      <h1 className="font-heading text-3xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        That route is not part of ShishuSurakkha. Return to the vaccination dashboard.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Go to dashboard</Link>
      </Button>
    </div>
  );
}

export default PageNotFound;
