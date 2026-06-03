"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { mainNav, workspaceNav, settingsNav } from "@/config/navigation"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function GlobalCommand() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 titlebar-no-drag">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="w-[180px] h-6 bg-surface-3/50 border border-border/40 rounded flex items-center gap-2 px-2 cursor-text hover:border-primary/30 hover:bg-surface-3 transition-all focus:outline-hidden">
          <Search className="size-2.5 text-txt-3 shrink-0" />
          <span className="text-txt-3 text-[10px] flex-1 text-left font-medium">Search…</span>
          <kbd className="font-mono text-[9px] text-txt-3 bg-background border border-border/60 rounded px-1 py-0 shadow-sm flex items-center h-4">
            <span className="text-[10px] mr-0.5">⌘</span>K
          </kbd>
        </PopoverTrigger>
        <PopoverContent className="w-[450px] p-0 shadow-xl rounded-xl border border-border/50 bg-background overflow-hidden mt-1" sideOffset={8}>
          <Command className="rounded-xl border-none">
            <CommandInput placeholder="Search pages and settings..." className="border-none focus:ring-0 text-sm" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Navigation">
                {mainNav.map((item) => (
                  <CommandItem key={item.label} onSelect={() => runCommand(() => item.href && router.push(item.href))}>
                    <item.icon className="mr-2 size-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Workspace">
                {workspaceNav.map((item) => (
                  <CommandItem key={item.label} onSelect={() => runCommand(() => item.href && router.push(item.href))}>
                    <item.icon className="mr-2 size-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Settings">
                {settingsNav.map((item) => (
                  <CommandItem 
                    key={item.label} 
                    onSelect={() => runCommand(() => {
                      if (item.action === "open-settings") {
                        window.dispatchEvent(new Event("open-settings"));
                      }
                    })}
                  >
                    <item.icon className="mr-2 size-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
