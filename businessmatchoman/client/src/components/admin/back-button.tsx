import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

/**
 * A professional back button for admin pages
 */
export function AdminBackButton() {
  return (
    <div className="mb-8 bg-primary/5 p-4 rounded-lg border border-primary/20 shadow-sm w-full max-w-md">
      <Link href="/">
        <Button
          variant="default"
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg flex items-center gap-3 shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">Return to Main Site</span>
        </Button>
      </Link>
      <p className="text-muted-foreground text-sm mt-3 text-center">
        Exit administrator mode and return to the main platform
      </p>
    </div>
  );
}
