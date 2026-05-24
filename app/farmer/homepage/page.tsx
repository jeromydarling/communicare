"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The old single-tab homepage editor moved to /farmer/site/ with multiple
// tabs (Content, Theme, Photos, Domain, Search & social). Redirect for
// any old links / bookmarks.
export default function HomepageEditorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/farmer/site/");
  }, [router]);
  return (
    <div className="px-6 py-20 text-center text-soil/65 italic">
      Taking you to the site builder…
    </div>
  );
}
