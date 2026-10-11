"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { captureAuthHash } from "../session";

export default function SessionCatch() {
  const router = useRouter();

  useEffect(() => {
    const caught = captureAuthHash();
    if (!caught) return;
    const path = window.location.pathname.replace(/\/$/, "");
    if (path !== "/account") {
      router.replace("/account/");
    }
  }, [router]);

  return null;
}
