from smartcard.CardMonitoring import CardMonitor, CardObserver
from smartcard.util import toHexString
import requests
import json

# カードの状態を監視するクラス
class MyObserver(CardObserver):
    def update(self, observable, actions):
        (addedcards, removedcards) = actions
        for card in addedcards:
            print(f"+ カードを検出しました")
            # 接続してUID（識別番号）を取得するコマンドを送信
            # [0xFF, 0xCA, 0x00, 0x00, 0x00] は標準的なUID取得コマンドです
            connection = card.createConnection()
            connection.connect()
            GET_UID = [0xFF, 0xCA, 0x00, 0x00, 0x00]
            data, sw1, sw2 = connection.transmit(GET_UID)
            uid = toHexString(data)
            print(f"  UID: {uid}")

            # UIDをサーバーに送信する
            url = "http://localhost:3000/NFC"  # サーバーのURLを指定
            payload ={"uid": uid, "status": "detected"}

            try:
                response = requests.post(url, json=payload)

                if response.status_code == 200:
                    print("サーバーに送信しました")
                else:
                    print(f"サーバーへの送信に失敗しました: {response.status_code}")
            except requests.RequestException as e:
                print(f"通信エラー: {e}")

        for card in removedcards:
            print("- カードが離されました")

# 監視の開始
if __name__ == "__main__":
    print("カードリーダーを待機中...")
    monitor = CardMonitor()
    observer = MyObserver()
    monitor.addObserver(observer)

    try:
        # プログラムを実行し続ける
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        # Ctrl+Cで停止
        monitor.removeObserver(observer)
        print("終了します")