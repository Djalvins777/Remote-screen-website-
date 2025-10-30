import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }]

export class WebRTCSignaling {
  private supabase = createClient()
  private channel: RealtimeChannel | null = null
  private peerConnection: RTCPeerConnection | null = null
  private sessionId: string
  private role: "sender" | "viewer"
  private onTrackCallback?: (stream: MediaStream) => void
  private onViewerConnectedCallback?: () => void

  constructor(sessionId: string, role: "sender" | "viewer") {
    this.sessionId = sessionId
    this.role = role
  }

  async initialize(stream?: MediaStream) {
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    // Add stream tracks if sender
    if (this.role === "sender" && stream) {
      stream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, stream)
      })
    }

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal("ice-candidate", { candidate: event.candidate })
      }
    }

    // Handle incoming tracks (viewer only)
    if (this.role === "viewer") {
      this.peerConnection.ontrack = (event) => {
        console.log("[v0] Received remote track")
        if (this.onTrackCallback && event.streams[0]) {
          this.onTrackCallback(event.streams[0])
        }
      }
    }

    // Subscribe to signaling channel
    this.channel = this.supabase.channel(`session:${this.sessionId}`)

    this.channel
      .on("broadcast", { event: "signal" }, async (payload) => {
        await this.handleSignal(payload.payload)
      })
      .subscribe()

    // If sender, wait for viewer to connect
    if (this.role === "sender") {
      console.log("[v0] Sender initialized, waiting for viewer")
    }

    // If viewer, create and send offer
    if (this.role === "viewer") {
      await this.createOffer()
    }
  }

  private async sendSignal(type: string, data: any) {
    await this.channel?.send({
      type: "broadcast",
      event: "signal",
      payload: {
        type,
        data,
        from: this.role,
      },
    })
  }

  private async handleSignal(signal: any) {
    // Ignore signals from self
    if (signal.from === this.role) return

    console.log("[v0] Received signal:", signal.type, "from:", signal.from)

    try {
      switch (signal.type) {
        case "offer":
          if (this.role === "sender") {
            await this.handleOffer(signal.data)
          }
          break

        case "answer":
          if (this.role === "viewer") {
            await this.handleAnswer(signal.data)
          }
          break

        case "ice-candidate":
          await this.handleIceCandidate(signal.data)
          break
      }
    } catch (error) {
      console.error("[v0] Error handling signal:", error)
    }
  }

  private async createOffer() {
    if (!this.peerConnection) return

    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    await this.sendSignal("offer", { offer })
    console.log("[v0] Sent offer")
  }

  private async handleOffer(data: any) {
    if (!this.peerConnection) return

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    await this.sendSignal("answer", { answer })
    console.log("[v0] Sent answer")

    if (this.onViewerConnectedCallback) {
      this.onViewerConnectedCallback()
    }
  }

  private async handleAnswer(data: any) {
    if (!this.peerConnection) return

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
    console.log("[v0] Received answer, connection established")
  }

  private async handleIceCandidate(data: any) {
    if (!this.peerConnection) return

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
      console.log("[v0] Added ICE candidate")
    } catch (error) {
      console.error("[v0] Error adding ICE candidate:", error)
    }
  }

  onTrack(callback: (stream: MediaStream) => void) {
    this.onTrackCallback = callback
  }

  onViewerConnected(callback: () => void) {
    this.onViewerConnectedCallback = callback
  }

  cleanup() {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    if (this.channel) {
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }
  }
}
