"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { login } from "./actions"
import { useSearchParams } from "next/navigation"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    
    startTransition(async () => {
      await login(formData)
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Life OS
          </h1>
          <p className="text-muted-foreground">Seu painel unificado para a vida</p>
        </div>

        {/* Login Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
            <CardDescription>Entre na sua conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                Email ou senha incorretos. Tente novamente.
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  disabled={isPending}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isPending}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-border" disabled={isPending} />
                  <span className="text-muted-foreground">Lembrar de mim</span>
                </label>
                <a href="#" className="text-primary hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <Button type="submit" className="cursor-pointer w-full" size="lg" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <a href="#" className="text-primary hover:underline cursor-pointer font-medium">
                Cadastre-se
              </a>
            </p>
          </CardFooter>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Ao entrar, você concorda com nossos{" "}
          <a href="#" className="hover:text-foreground underline">
            Termos de Serviço
          </a>{" "}
          e{" "}
          <a href="#" className="hover:text-foreground underline">
            Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  )
}
