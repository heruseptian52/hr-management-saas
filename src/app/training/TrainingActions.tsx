"use client";
import { FormEvent } from "react";
export function ConfirmTrainingForm({ message, children, ...props }: React.ComponentProps<"form"> & { message: string }) {
  function submit(event: FormEvent<HTMLFormElement>) { if (!window.confirm(message)) event.preventDefault(); }
  return <form {...props} onSubmit={submit}>{children}</form>;
}
