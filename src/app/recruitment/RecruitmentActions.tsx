"use client";
import { FormEvent } from "react";

export function ConfirmRecruitmentForm({ children, message, ...props }: React.ComponentProps<"form"> & { message: string }) {
  function submit(event: FormEvent<HTMLFormElement>) { if (!window.confirm(message)) event.preventDefault(); }
  return <form {...props} onSubmit={submit}>{children}</form>;
}
