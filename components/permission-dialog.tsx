import { AlertCircle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function PermissionInfo() {
  return (
    <Alert className="bg-blue-50 border-blue-200">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">Screen Sharing Permission</AlertTitle>
      <AlertDescription className="text-blue-800">
        Your browser will ask for permission to share your screen. Select the window or screen you want to share.
      </AlertDescription>
    </Alert>
  )
}

export function PermissionError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Permission Denied</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
