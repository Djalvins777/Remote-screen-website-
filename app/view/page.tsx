"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { WebRTCSignaling } from "@/lib/webrtc"
import { Smartphone, ArrowLeft, Loader2, AlertCircle, Lock, CheckCircle } from "lucide-react"
import Link from "next/link"

function ViewPageContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get("code")

  const [accessCode, setAccessCode] = useState("")
  const [isAccessGranted, setIsAccessGranted] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)
  const OWNER_ACCESS_CODE = "walkthrough"

  const [code, setCode] = useState(codeFromUrl || "")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("Not connected")
  const videoRef = useRef<HTMLVideoElement>(null)
  const signalingRef = useRef<WebRTCSignaling | null>(null)

  const supabase = createClient()

  const verifyAccessCode = () => {
    if (accessCode.toLowerCase() === OWNER_ACCESS_CODE.toLowerCase()) {
      setIsAccessGranted(true)
      setAccessError(null)
    } else {
      setAccessError("Invalid access code. Please try again.")
    }
  }

  const connectToSession = async () => {
    if (!code || code.length !== 6) {
      setError("Please enter a valid 6-character code")
      return
    }

    setIsConnecting(true)
    setError(null)
    setConnectionStatus("Looking for session...")

    try {
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_code", code.toUpperCase())
        .eq("is_active", true)
        .single()

      if (sessionError || !session) {
        throw new Error("Session not found or inactive. Please check the code and try again.")
      }

      const expiresAt = new Date(session.expires_at)
      if (expiresAt < new Date()) {
        throw new Error("This session has expired. Please ask for a new code.")
      }

      setSessionId(session.id)
      setConnectionStatus("Establishing connection...")

      signalingRef.current = new WebRTCSignaling(session.id, "viewer")
      await signalingRef.current.initialize()

      signalingRef.current.onTrack((stream) => {
        console.log("[v0] Stream received, updating video element")
        setConnectionStatus("Connected")
        setIsConnected(true)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch((err) => {
            console.error("[v0] Error playing video:", err)
          })
        }
      })

      setIsConnecting(false)
    } catch (err) {
      console.error("[v0] Error connecting to session:", err)
      setError(err instanceof Error ? err.message : "Failed to connect to session")
      setIsConnecting(false)
      setConnectionStatus("Connection failed")
    }
  }

  const disconnect = () => {
    if (signalingRef.current) {
      signalingRef.current.cleanup()
      signalingRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsConnected(false)
    setSessionId(null)
    setCode("")
    setIsConnecting(false)
    setConnectionStatus("Not connected")
  }

  useEffect(() => {
    if (codeFromUrl && isAccessGranted) {
      connectToSession()
    }
    return () => {
      if (signalingRef.current) {
        signalingRef.current.cleanup()
      }
    }
  }, [isAccessGranted])

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
          {!isAccessGranted ? (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-blue-600" />
                      Owner Access Required
                    </CardTitle>
                    <CardDescription>Enter the owner access code to view shared screens</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {accessError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{accessError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Access Code</Label>
                    <Input
                      id="accessCode"
                      type="password"
                      placeholder="Enter owner access code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          verifyAccessCode()
                        }
                      }}
                      className="text-center text-lg tracking-wider"
                    />
                    <p className="text-xs text-slate-500 text-center">Hint: The access code is "walkthrough"</p>
                  </div>

                  <Button onClick={verifyAccessCode} size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                    <Lock className="w-4 h-4 mr-2" />
                    Verify Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Access granted! You can now view shared screens.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Smartphone className="w-5 h-5" />
                        View Shared Screen
                      </CardTitle>
                      <CardDescription>Enter the session code to view a shared screen</CardDescription>
                    </div>
                    {isConnected && (
                      <Badge variant="default" className="bg-green-500">
                        <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                        Connected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isConnecting && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <AlertDescription className="text-blue-800">{connectionStatus}</AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {!isConnected ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="code">Session Code</Label>
                        <Input
                          id="code"
                          type="text"
                          placeholder="Enter 6-character code"
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          maxLength={6}
                          className="text-center text-2xl tracking-wider font-mono"
                          disabled={isConnecting}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !isConnecting) {
                              connectToSession()
                            }
                          }}
                        />
                      </div>

                      <Button onClick={connectToSession} size="lg" className="w-full" disabled={isConnecting}>
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800 text-center">
                          Connected to session <span className="font-mono font-bold">{code}</span>
                        </p>
                      </div>

                      <Button onClick={disconnect} variant="outline" size="lg" className="w-full bg-transparent">
                        Disconnect
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {isConnected && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Screen View</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative bg-slate-900 rounded-lg overflow-hidden" style={{ minHeight: "400px" }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                        style={{ maxHeight: "600px" }}
                      />
                      {!videoRef.current?.srcObject && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-sm">Waiting for video stream...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ViewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ViewPageContent />
    </Suspense>
  )
}
