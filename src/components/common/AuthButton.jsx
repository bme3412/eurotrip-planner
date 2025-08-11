"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <button className="btn-secondary" disabled>
        Sign in
      </button>
    );
  }

  if (session?.user) {
    return (
      <button className="btn-secondary" onClick={() => signOut()}>
        Sign out
      </button>
    );
  }

  return (
    <button className="btn-secondary" onClick={() => signIn()}>
      Sign in
    </button>
  );
}


