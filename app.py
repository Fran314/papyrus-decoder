from flask import Flask, jsonify, send_from_directory

from nfc_reader import open_reader

ABSENCE_SCANS = 3

app = Flask(__name__)
reader = open_reader()

last_seen = None
misses = 0


def poll_new_tag():
    global last_seen, misses
    uid = reader.read()
    if uid is not None:
        misses = 0
        if uid != last_seen:
            last_seen = uid
            return uid
        return None
    if last_seen is not None:
        misses += 1
        if misses >= ABSENCE_SCANS:
            last_seen = None
    return None


@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/tag")
def tag():
    return jsonify(uid=poll_new_tag())


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
