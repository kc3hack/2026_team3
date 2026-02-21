from smartcard.CardMonitoring import CardMonitor, CardObserver
from smartcard.util import toHexString
import requests
import json
import threading
import time
import re

class MyObserver(CardObserver):
    def __init__(self, stop_event):
        self.stop_event = stop_event

    def update(self, observable, actions):
        (addedcards, removedcards) = actions
        for card in addedcards:
            print(f"\n+ カードを検出しました")
            connection = card.createConnection()
            connection.connect()
            
            # 1. UIDの取得
            GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
            data, sw1, sw2 = connection.transmit(GET_UID)
            uid = toHexString(data)
            print(f"  UID: {uid}")

            # 2. NFC内の暗号化データを読み取る
            encrypted_payload = None
            try:
                raw_bytes = []
                # 修正: 16バイト(0x10)ずつ読み取るように戻し、4ブロック(ページ)飛ばしでループ
                for block in range(4, 32, 4): 
                    READ_CMD = [0xFF, 0xB0, 0x00, block, 0x10]
                    read_data, r_sw1, r_sw2 = connection.transmit(READ_CMD)
                    
                    if r_sw1 == 0x90 and r_sw2 == 0x00:
                        raw_bytes.extend(read_data)
                    else:
                        # ★ここが重要！読み取り拒否された場合のエラーコードを出力
                        print(f"  [Error] ブロック {block} の読み取り失敗: SW1={hex(r_sw1)}, SW2={hex(r_sw2)}")

                read_text = bytes(raw_bytes).decode('ascii', errors='ignore')
                print(f"  [Debug] 読み取った生テキスト: {read_text}")

                match = re.search(r'([0-9a-f]{24}):([0-9a-f]{8}):([0-9a-f]{32})', read_text)
                
                encrypted_payload = None
                if match:
                    encrypted_payload = match.group(0)
                    print(f"  ★パスワードデータ検出: {encrypted_payload}")
                else:
                    print("  指定フォーマットのパスワードデータが見つかりませんでした。")

            except Exception as e:
                print(f"  データ読み取り中にエラーが発生しました: {e}")

            # 3. UIDと「文字列のパスワード」をサーバーに送信
            url = "http://localhost:5000/NFC"
            payload = {
                "uid": uid, 
                "status": "detected",
                "encrypted_password": encrypted_payload  # 文字列("iv:data:tag")をそのまま送る
            }
            print(f"  [Debug] 送信するJSONデータ: {payload}")

            try:
                response = requests.post(url, json=payload)
                if response.status_code == 200:
                    print("  サーバーに送信しました")
                    self.stop_event.set()
                else:
                    print(f"  サーバーへの送信に失敗しました: {response.status_code}")
            except requests.RequestException as e:
                print(f"  通信エラー: {e}")

        for card in removedcards:
            print("- カードが離されました")

if __name__ == "__main__":
    print("カードリーダーを待機中...")
    monitor = CardMonitor()
    stop_event = threading.Event()
    observer = MyObserver(stop_event)
    monitor.addObserver(observer)

    try:
        while not stop_event.is_set():
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        monitor.deleteObserver(observer)
        print("終了します")