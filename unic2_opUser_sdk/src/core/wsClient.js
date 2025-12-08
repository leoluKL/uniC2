export default class WsClient {
    constructor({ wsUrl, getTokenFn, parent, 
                  initialDelayMs = 1000, maxDelayMs = 30000 }) {

        this.wsUrl = wsUrl
        this.getTokenFn = getTokenFn        // must return fresh token
        this.parent = parent

        this.ws = null

        // reconnect backoff
        this.initialDelayMs = initialDelayMs
        this.maxDelayMs = maxDelayMs
        this.currentDelayMs = initialDelayMs
        this._shouldReconnect = true
        this._timer = null

        this._connect()
    }

    async _connect() {
        const token = await this.getTokenFn()
        if (!this.wsUrl || !token) return

        try {
            this.ws = new WebSocket(this.wsUrl, [token])

            this.ws.onopen = () => {
                this.currentDelayMs = this.initialDelayMs     // reset backoff
            }

            this.ws.onmessage = evt => {
                let msg
                try { msg = JSON.parse(evt.data) } catch { return }
                if (this.parent?._onWSRecivedMsg) {
                    this.parent._onWSRecivedMsg(msg)
                }
            }

            this.ws.onclose = () => {
                this.ws = null
                if (this._shouldReconnect) this._scheduleReconnect()
            }

            this.ws.onerror = () => {
                // browser will follow with onclose
            }

        } catch {
            this.ws = null
            this._scheduleReconnect()
        }
    }

    _scheduleReconnect() {
        if (!this._shouldReconnect || this._timer) return

        this._timer = setTimeout(() => {
            this._timer = null
            this._connect()
        }, this.currentDelayMs)

        // exponential backoff
        this.currentDelayMs = Math.min(
            this.currentDelayMs * 2,
            this.maxDelayMs
        )
    }

    send(obj) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
        try {
            this.ws.send(JSON.stringify(obj))
            return true
        } catch {
            return false
        }
    }

    close() {
        this._shouldReconnect = false
        if (this._timer) {
            clearTimeout(this._timer)
            this._timer = null
        }
        if (this.ws) {
            try { this.ws.close() } catch {}
            this.ws = null
        }
    }
}