"use client"

import * as React from "react"
import { Moon, Sun, Laptop, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function ModeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="focus-visible:ring-0">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2 cursor-pointer">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <span>Claro</span>
          {theme === 'light' && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2 cursor-pointer">
          <Moon className="h-4 w-4 text-muted-foreground" />
          <span>Escuro</span>
          {theme === 'dark' && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2 cursor-pointer">
          <Laptop className="h-4 w-4 text-muted-foreground" />
          <span>Sistema</span>
          {theme === 'system' && <Check className="ml-auto h-4 w-4 text-primary" />}
        </DropdownMenuItem>

      </DropdownMenuContent>
    </DropdownMenu>
  )
}