"use client"

import * as React from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
 children: React.ReactNode
 defaultTheme?: Theme
}

type ThemeProviderState = {
 theme: Theme
 setTheme: (theme: Theme) => void
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(
 undefined
)

export function ThemeProvider({
 children,
 defaultTheme = "system",
}: ThemeProviderProps) {
 const [theme, setTheme] = React.useState<Theme>(defaultTheme)

 React.useEffect(() => {
   const root = window.document.documentElement
   root.classList.remove("light", "dark")

   if (theme === "system") {
     const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
       .matches
       ? "dark"
       : "light"
     root.classList.add(systemTheme)
   } else {
     root.classList.add(theme)
   }
 }, [theme])

 // To detect device theme change
 React.useEffect(() => {
   if (theme !== "system") return

   const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
   const handleChange = () => {
     const root = window.document.documentElement
     root.classList.remove("light", "dark")
     root.classList.add(mediaQuery.matches ? "dark" : "light")
   }

   mediaQuery.addEventListener("change", handleChange)
   return () => mediaQuery.removeEventListener("change", handleChange)
 }, [theme])

 const value = {
   theme,
   setTheme: (theme: Theme) => {
     setTheme(theme)
   },
 }

 return (
   <ThemeProviderContext.Provider value={value}>
     {children}
   </ThemeProviderContext.Provider>
 )
}

export const useTheme = () => {
 const context = React.useContext(ThemeProviderContext)

 if (context === undefined)
   throw new Error("useTheme must be used within a ThemeProvider")

 return context
}

