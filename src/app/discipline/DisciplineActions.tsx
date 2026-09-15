"use client"; import { FormEvent } from "react";
export function ConfirmDisciplineForm({message,children,...props}:React.ComponentProps<"form">&{message:string}){function submit(e:FormEvent<HTMLFormElement>){if(!window.confirm(message))e.preventDefault();}return <form {...props} onSubmit={submit}>{children}</form>}
