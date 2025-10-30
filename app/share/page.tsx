"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { generateSessionCode } from "@/lib/generate-code"
import { WebRTCSignaling } from "@/lib/webrtc"
import { PermissionInfo, PermissionError } from "@/components/permission-dialog"
import { Monitor, Copy, CheckCircle2, Users, ArrowLeft, Clock, Video } from "lucide-react"
import Link from "next/link"
import { isMobileDevice, getBrowserInfo } from "@/lib/device-detection"

export default function SharePage() {
  const [sessionCode, setSessionCode] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [browserInfo, setBrowserInfo] = useState({ name: "Unknown", supportsScreenShare: false })
  const [shareMode, setShareMode] = useState<"screen" | "camera">("screen")
  const [isMounted, setIsMounted] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const signalingRef = useRef<WebRTCSignaling | null>(null)

  const supabase = createClient()

  useEffect(() => {
    setIsMounted(true)

    if (typeof window !== "undefined") {
      const mobile = isMobileDevice()
      const browser = getBrowserInfo()
      setIsMobile(mobile)
      setBrowserInfo(browser)

      // Set default share mode based on device
      if (mobile) {
        setShareMode("camera")
      }
    }
  }, [])

  const startSharing = async () => {
    if (typeof window === "undefined") {
      setError("Cannot access media devices in this environment.")
      return
    }

    try {
      setError(null)
      setPermissionDenied(false)

      let stream: MediaStream

      if (shareMode === "camera" || isMobile) {
        console.log("[v0] Requesting camera access...")

        // Request camera for mobile or when camera mode is selected
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Use back camera by default on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        console.log("[v0] Camera access granted")
      } else {
        console.log("[v0] Requesting screen capture...")

        // Request screen share for desktop
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "monitor",
          } as any,
          audio: false,
        })

        console.log("[v0] Screen capture granted")
      }

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      const code = generateSessionCode()
      const deviceName = isMobile ? `Mobile - ${browserInfo.name}` : `Desktop - ${browserInfo.name}`
      const expires = new Date()
      expires.setHours(expires.getHours() + 24)

      const { data, error: dbError } = await supabase
        .from("sessions")
        .insert({
          session_code: code,
          device_name: deviceName,
          is_active: true,
          expires_at: expires.toISOString(),
        })
        .select()
        .single()

      if (dbError) throw dbError

      setSessionCode(code)
      setSessionId(data.id)
      setExpiresAt(expires)
      setIsSharing(true)

      signalingRef.current = new WebRTCSignaling(data.id, "sender")
      await signalingRef.current.initialize(stream)

      signalingRef.current.onViewerConnected(() => {
        setViewerCount((prev) => prev + 1)
      })

      stream.getTracks()[0].addEventListener("ended", () => {
        stopSharing()
      })
    } catch (err) {
      console.error("[v0] Error starting share:", err)

      if (err instanceof Error && err.name === "NotAllowedError") {
        setPermissionDenied(true)
        const mediaType = shareMode === "camera" ? "camera" : "screen sharing"
        setError(`${mediaType} permission was denied. Please allow access to share.`)
      } else if (err instanceof Error && err.name === "NotSupportedError") {
        setError("This feature is not supported in your browser. Please try a different browser.")
      } else if (err instanceof Error && err.name === "NotFoundError") {
        setError("No camera found. Please connect a camera and try again.")
      } else {
        setError(err instanceof Error ? err.message : "Failed to start sharing")
      }
    }
  }

  const stopSharing = async () => {
    if (signalingRef.current) {
      signalingRef.current.cleanup()
      signalingRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (sessionId) {
      await supabase.from("sessions").update({ is_active: false }).eq("id", sessionId)
    }

    setIsSharing(false)
    setSessionCode(null)
    setSessionId(null)
    setViewerCount(0)
    setExpiresAt(null)
    setPermissionDenied(false)
  }

  const copyCode = () => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareLink = () => {
    if (sessionCode) {
      const url = `${window.location.origin}/view?code=${sessionCode}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    return () => {
      if (signalingRef.current) {
        signalingRef.current.cleanup()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-red-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇺🇸</span>
            <span className="font-semibold text-slate-700">2025 Grant Winners USA</span>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {shareMode === "camera" ? <Video className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    {shareMode === "camera" ? "Share Your Camera" : "Share Your Screen"}
                  </CardTitle>
                  <CardDescription>
                    {isMobile ? "Share your camera view with others" : "Start sharing and get a code for viewers"}
                  </CardDescription>
                </div>
                {isSharing && (
                  <Badge variant="default" className="bg-green-500">
                    <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                    Live
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isMobile && !isSharing && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Video className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 mb-1">Mobile Device Detected</p>
                      <p className="text-sm text-blue-700">
                        Screen sharing is not available on mobile browsers. You can share your camera instead to show
                        what you see.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isMobile && !isSharing && (
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  <Button
                    variant={shareMode === "screen" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setShareMode("screen")}
                  >
                    <Monitor className="w-4 h-4 mr-2" />
                    Screen
                  </Button>
                  <Button
                    variant={shareMode === "camera" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setShareMode("camera")}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Camera
                  </Button>
                </div>
              )}

              {!isSharing && !permissionDenied && <PermissionInfo />}

              {permissionDenied && <PermissionError message={error || "Permission denied"} />}

              {error && !permissionDenied && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
              )}

              {!isSharing ? (
                <Button onClick={startSharing} size="lg" className="w-full">
                  {shareMode === "camera" ? (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Start Camera Sharing
                    </>
                  ) : (
                    <>
                      <Monitor className="w-4 h-4 mr-2" />
                      Start Screen Sharing
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 text-center">
                      <p className="text-sm text-slate-600 mb-2">Your Session Code</p>
                      <div className="text-4xl font-bold text-slate-900 tracking-wider mb-4">{sessionCode}</div>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={copyCode} variant="outline" size="sm">
                          {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          {copied ? "Copied!" : "Copy Code"}
                        </Button>
                        <Button onClick={shareLink} variant="outline" size="sm">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </Button>
                      </div>
                    </div>

                    {expiresAt && (
                      <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        <span>Session expires in 24 hours</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Viewers Connected</span>
                      </div>
                      <Badge variant="secondary">{viewerCount}</Badge>
                    </div>
                  </div>

                  <Button onClick={stopSharing} variant="destructive" size="lg" className="w-full">
                    Stop Sharing
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {isSharing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg bg-slate-900"
                  style={{ maxHeight: "400px" }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
