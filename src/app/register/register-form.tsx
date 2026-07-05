"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

import { registerAction } from "@/app/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/server/validators/auth";

export function RegisterForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      phone: "",
    },
  });

  function onSubmit(data: RegisterInput) {
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("fullName", data.fullName);
    if (data.phone) {
      formData.set("phone", data.phone);
    }

    startTransition(() => {
      void registerAction(formData);
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" autoComplete="name" {...register("fullName")} />
        {errors.fullName ? <p className="text-sm text-red-600">{errors.fullName.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" autoComplete="email" type="email" {...register("email")} />
        {errors.email ? <p className="text-sm text-red-600">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" autoComplete="tel" {...register("phone")} />
        {errors.phone ? <p className="text-sm text-red-600">{errors.phone.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" autoComplete="new-password" type="password" {...register("password")} />
        {errors.password ? <p className="text-sm text-red-600">{errors.password.message}</p> : null}
      </div>
      <Button className="w-full gap-2" disabled={isPending} type="submit">
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Creating account..." : "Create member account"}
      </Button>
    </form>
  );
}
