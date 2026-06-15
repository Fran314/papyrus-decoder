from pathlib import Path

from flask import Flask, jsonify, send_from_directory

from nfc_reader import open_reader

ABSENCE_SCANS = 3

TAGS = {
    "53cd2fe9630001": "papyrus-1",
    "53d8f6e6630001": "papyrus-2",
}

app = Flask(__name__)
reader = open_reader()

ASSETS = Path(app.static_folder) / "assets"

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
    uid = poll_new_tag()
    return jsonify(scene=TAGS.get(uid) if uid else None)


@app.route("/assets")
def assets():
    urls = ["/static/assets/" + p.name for p in sorted(ASSETS.iterdir()) if p.is_file()]
    return jsonify(urls)


@app.route("/reset", methods=["POST"])
def reset():
    global last_seen, misses
    last_seen = None
    misses = 0
    return ("", 204)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
