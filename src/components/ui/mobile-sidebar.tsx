import * as React from "react"
import { Sidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export const MobileSidebar = React.forwardRef<
    React.ElementRef<typeof Sidebar>,
    React.ComponentPropsWithoutRef<typeof Sidebar>
>(({ className, children, ...props }, ref) => {
    return (
        <Sidebar ref={ref} className={cn(className)} {...props}>
            {/* 
        Wrapper layer: Injects Capacitor safe-area padding externally 
        so we do not modify the original shadcn/ui component code.
      */}
            <div className="flex h-full w-full flex-col safe-area-top safe-area-bottom">
                {children}
            </div>
        </Sidebar>
    )
})

MobileSidebar.displayName = "MobileSidebar"
