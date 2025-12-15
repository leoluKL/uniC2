# ws_client.py
import time
import threading
import websocket


class WsClient:
    def __init__(self, wsServiceUrl, getTokenFn):
        self.wsServiceUrl = wsServiceUrl
        self.getTokenFn=getTokenFn
        self.ws = None
        self.connected = False
        self._lock = threading.Lock()
        self._stop_flag = False

    def _on_message(self, ws, message):
        print(f"[WS] message from server:", message)

    def _on_open(self, ws):
        self.connected = True
        print("[WS] connected")

    def _on_close(self, ws, code, msg):
        self.connected = False
        print("[WS] closed")


    def _connect(self):
        token = self.getTokenFn()
        self.ws = websocket.WebSocketApp(
            self.wsServiceUrl,
            subprotocols=[token],
            on_message=self._on_message,
            on_open=self._on_open,
            on_close=self._on_close,
        )

        self.ws.run_forever(ping_interval=20, ping_timeout=10)

    def _run_forever(self):
        backoff = 1 
        # loop until stop_flag is set
        while not self._stop_flag:
            if not self.connected:
                try:
                    self._connect()
                except Exception as e:
                    print("[WS] connect error:", e)
                time.sleep(backoff)
                backoff = min(backoff * 2, 60)
            else:
                backoff = 1
                time.sleep(1)

    def start(self):
        threading.Thread(target=self._run_forever, daemon=True).start()

    def stop(self):
        self._stop_flag = True
        if self.ws:
            try:
                self.ws.close()
            except:
                pass

    def send(self, text: str):
        if not self.connected:
            print("[WS] cannot send, not connected")
            return
        with self._lock:
            try:
                self.ws.send(text)
            except Exception as e:
                print("[WS] send error:", e)
