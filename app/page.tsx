import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, Smartphone, ExternalLink } from "lucide-react"

export default function HomePage() {
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/share` : "/share"
  const viewUrl = typeof window !== "undefined" ? `${window.location.origin}/view` : "/view"

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-red-50 to-white">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-6xl">🇺🇸</span>
            <h1 className="text-4xl font-bold text-slate-900">2025 Grant Winners USA</h1>
          </div>
          <p className="text-lg text-slate-600">Two separate links for sharing and viewing screens</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Share Screen Section */}
          <Card className="border-2 border-blue-500 shadow-lg bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-4 mx-auto">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-center">Share Your Screen</CardTitle>
              <CardDescription className="text-center text-base">
                Use this link to start sharing your screen with others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/share">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Go to Share Page
                </Button>
              </Link>
              <div className="p-3 bg-slate-100 rounded-lg">
                <p className="text-xs text-slate-600 mb-2 font-medium">Direct Link:</p>
                <code className="text-xs text-slate-800 break-all">{shareUrl}</code>
              </div>
            </CardContent>
          </Card>

          {/* View Screen Section */}
          <Card className="border-2 border-green-500 shadow-lg bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center mb-4 mx-auto">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-center">View Shared Screen</CardTitle>
              <CardDescription className="text-center text-base">
                Use this link on your phone to view someone's shared screen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/view">
                <Button className="w-full bg-green-600 hover:bg-green-700" size="lg">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Go to View Page
                </Button>
              </Link>
              <div className="p-3 bg-slate-100 rounded-lg">
                <p className="text-xs text-slate-600 mb-2 font-medium">Direct Link:</p>
                <code className="text-xs text-slate-800 break-all">{viewUrl}</code>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">Share the appropriate link with your intended users</p>
        </div>
      </div>
    </div>
  )
}
