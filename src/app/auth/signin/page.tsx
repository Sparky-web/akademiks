"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import LoginCard from "~/components/custom/auth/login-card";

export default function AuthScreen({
  onLogin,
}: {
  onLogin: (type: "student" | "teacher") => void;
}) {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <LoginCard />
    </div>
  );
}
