"""
MockTest.pro — Level 99 Ultimate Edition (SINGLE-FILE EDITION)
==============================================================
The complete mock-test app in ONE easy-to-run Python file.

Features
  * Timed tests with live countdown + auto-submit
  * Instant right/wrong feedback with explanations
  * 140 starter questions (GK, Maths, English, Reasoning, Science)
  * XP, levels (up to 99) and daily streaks
  * Weak-question tracking + Weak Practice / Hard Drill modes
  * Per-subject analytics + recent attempt history
  * Question bank management: bulk JSON import, export, delete
  * GitHub backup bridge (sync.py) so data survives hosting resets
  * Light / dark theme, mobile friendly, keyboard shortcuts

How to run
  pip install flask
  python app.py
  -> open http://127.0.0.1:5000

Everything is stored in mocktest.db next to this file. No accounts, no API
keys, works offline. The export password is EXPORT_PASSWORD below.
"""

import json
import os
import random
import sqlite3
import time
import hashlib
from io import BytesIO
from contextlib import closing

try:
    from flask import Flask, request, jsonify, send_file
except ImportError:
    raise SystemExit(
        "Flask is not installed. Run:  pip install flask"
    )

EXPORT_PASSWORD = "121520"  # password required to download the question bank
EXPORT_PASSWORD_HASH = hashlib.sha256(EXPORT_PASSWORD.encode()).hexdigest()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _resolve_db_path():
    """Pick a writable location for the SQLite database.

    Locally this is mocktest.db next to the script. On hosts like Render
    the project directory is read-only, so we fall back to /tmp (note:
    /tmp is wiped whenever the service restarts — see the README notes
    in the module docstring about persistence).
    """
    for base in (BASE_DIR, "/tmp"):
        candidate = os.path.join(base, "mocktest.db")
        try:
            if not os.path.exists(candidate):
                with open(candidate, "a"):
                    pass
            return candidate
        except OSError:
            continue
    return os.path.join(BASE_DIR, "mocktest.db")


DB_PATH = _resolve_db_path()

app = Flask(__name__)

# Optional GitHub backup bridge (sync.py). If the file is missing or no
# GitHub token is configured, the app runs exactly as before.
try:
    import sync  # noqa: F401
except ImportError:
    sync = None


# =====================================================================
# DATABASE
# =====================================================================

def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


SCHEMA = """
CREATE TABLE IF NOT EXISTS questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category    TEXT NOT NULL,
    topic       TEXT NOT NULL,
    question    TEXT NOT NULL,
    options     TEXT NOT NULL,   -- JSON array of 4 choices
    correct     INTEGER NOT NULL, -- index of the right answer (0-3)
    explanation TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_q_cat      ON questions(category);
CREATE INDEX IF NOT EXISTS idx_q_cat_topic ON questions(category, topic);

CREATE TABLE IF NOT EXISTS attempts (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    category TEXT,
    topic    TEXT,
    total    INTEGER,
    correct  INTEGER,
    wrong    INTEGER,
    skipped  INTEGER,
    pct      REAL,
    time_sec INTEGER,
    mode     TEXT,
    ts       INTEGER
);
CREATE INDEX IF NOT EXISTS idx_a_user ON attempts(username);

CREATE TABLE IF NOT EXISTS weak_questions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT,
    question_id INTEGER,
    wrong_count INTEGER DEFAULT 1,
    last_wrong  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_w_user ON weak_questions(username);

CREATE TABLE IF NOT EXISTS user_stats (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT UNIQUE,
    xp          INTEGER DEFAULT 0,
    streak      INTEGER DEFAULT 0,
    last_active INTEGER,
    level       INTEGER DEFAULT 1
);
"""


# =====================================================================
# SEED DATA  (the same 140 questions, grouped by category + topic)
# =====================================================================

SEED_QUESTIONS = [
    # ---------------- GK : World Geography ----------------
    ("GK", "World Geography", "भारत की राजधानी क्या है?", ["मुंबई", "नई दिल्ली", "कोलकाता", "चेन्नई"], 1, "नई दिल्ली भारत की राजधानी है।"),
    ("GK", "World Geography", "टॉरस पर्वत किस देश में है?", ["भारत", "तुर्की", "पाकिस्तान", "ईरान"], 1, "टॉरस पर्वत तुर्की में है।"),
    ("GK", "World Geography", "नील नदी किस महाद्वीप में है?", ["एशिया", "अफ्रीका", "यूरोप", "ऑस्ट्रेलिया"], 1, "नील नदी अफ्रीका में है।"),
    ("GK", "World Geography", "विश्व का सबसे बड़ा महाद्वीप कौन सा है?", ["अफ्रीका", "एशिया", "यूरोप", "उत्तरी अमेरिका"], 1, "एशिया क्षेत्रफल में सबसे बड़ा है।"),
    ("GK", "World Geography", "माउंट एवरेस्ट की ऊँचाई कितनी है?", ["8848 मी", "8611 मी", "7850 मी", "9200 मी"], 0, "8848 मीटर।"),
    ("GK", "World Geography", "विश्व का सबसे बड़ा महासागर कौन सा है?", ["अटलांटिक", "हिंद", "आर्कटिक", "प्रशांत"], 3, "प्रशांत महासागर सबसे बड़ा है।"),
    ("GK", "World Geography", "भारत की सबसे लंबी नदी कौन सी है?", ["गंगा", "यमुना", "गोदावरी", "ब्रह्मपुत्र"], 0, "गंगा भारत की सबसे लंबी नदी है।"),
    ("GK", "World Geography", "थार मरुस्थल कहाँ स्थित है?", ["राजस्थान", "गुजरात", "पंजाब", "हरियाणा"], 0, "मुख्यतः राजस्थान में।"),
    ("GK", "World Geography", "सुंडा खाड़ी किन दो द्वीपों के बीच है?", ["जावा और सुमात्रा", "बोर्नियो और सुलावेसी", "जावा और बाली", "सुमात्रा और कालीमंतन"], 0, "जावा और सुमात्रा के बीच।"),
    ("GK", "World Geography", "गोबी रेगिस्तान किस देश में है?", ["भारत", "चीन", "मंगोलिया", "रूस"], 2, "मंगोलिया और चीन में।"),
    ("GK", "World Geography", "अरब सागर किसके दक्षिण में स्थित है?", ["भारत", "पाकिस्तान", "ईरान", "अरब प्रायद्वीप"], 3, "अरब प्रायद्वीप के दक्षिण में।"),
    ("GK", "World Geography", "डेन्यूब नदी किस सागर में गिरती है?", ["काला सागर", "भूमध्य सागर", "कैस्पियन सागर", "अटलांटिक"], 0, "काला सागर में।"),
    ("GK", "World Geography", "एशिया और अफ्रीका को जोड़ने वाला स्थलडमरूमध्य?", ["स्वेज", "पनामा", "जिब्राल्टर", "बोस्पोरस"], 0, "स्वेज स्थलडमरूमध्य।"),
    ("GK", "World Geography", "उत्तरी अमेरिका की सबसे लंबी नदी?", ["मिसिसिपी", "मिसौरी", "अमेज़न", "कोलोराडो"], 1, "मिसौरी-मिसिसिपी प्रणाली।"),
    ("GK", "World Geography", "किलिमंजारो पर्वत किस देश में है?", ["केन्या", "तंजानिया", "युगांडा", "रवांडा"], 1, "तंजानिया में।"),
    ("GK", "World Geography", "विश्व की सबसे बड़ी झील?", ["कैस्पियन सागर", "सुपीरियर", "विक्टोरिया", "बैकाल"], 0, "कैस्पियन सागर।"),
    ("GK", "World Geography", "एंजिल जलप्रपात किस नदी पर है?", ["नील", "अमेज़न", "कांगो", "ओरिनोको"], 1, "अमेज़न की सहायक नदी पर।"),
    ("GK", "World Geography", "ग्रेट बैरियर रीफ किस देश के पास है?", ["ऑस्ट्रेलिया", "न्यूजीलैंड", "फिजी", "पापुआ न्यू गिनी"], 0, "ऑस्ट्रेलिया के पूर्वी तट पर।"),
    ("GK", "World Geography", "यूरोप का सबसे ऊँचा पर्वत शिखर?", ["एल्ब्रुस", "मोंट ब्लांक", "मैटरहॉर्न", "ग्रॉसग्लॉकनर"], 0, "माउंट एल्ब्रुस।"),
    ("GK", "World Geography", "कर्क रेखा कितने देशों से होकर गुजरती है?", ["12", "16", "18", "20"], 1, "16 देशों से।"),

    # ---------------- GK : Indian History ----------------
    ("GK", "Indian History", "भारत का पहला प्रधानमंत्री कौन था?", ["जवाहरलाल नेहरू", "महात्मा गांधी", "सरदार पटेल", "डॉ. राजेंद्र प्रसाद"], 0, "जवाहरलाल नेहरू।"),
    ("GK", "Indian History", "ताजमहल किसने बनवाया?", ["अकबर", "शाहजहां", "बाबर", "औरंगजेब"], 1, "शाहजहां ने।"),
    ("GK", "Indian History", "1857 का विद्रोह किस वर्ष हुआ?", ["1856", "1857", "1858", "1859"], 1, "1857 में।"),
    ("GK", "Indian History", "भारत को स्वतंत्रता कब मिली?", ["1945", "1946", "1947", "1948"], 2, "15 अगस्त 1947।"),
    ("GK", "Indian History", "अशोक किस वंश के थे?", ["मौर्य", "गुप्त", "चोल", "मुगल"], 0, "मौर्य वंश।"),
    ("GK", "Indian History", "भारत का संविधान कब लागू हुआ?", ["26 नवंबर 1949", "26 जनवरी 1950", "15 अगस्त 1947", "2 अक्टूबर 1950"], 1, "26 जनवरी 1950।"),
    ("GK", "Indian History", "सिख धर्म के संस्थापक कौन थे?", ["गुरु नानक", "गुरु गोबिंद सिंह", "गुरु अंगद", "गुरु अर्जुन"], 0, "गुरु नानक।"),
    ("GK", "Indian History", "पानीपत का पहला युद्ध किस वर्ष लड़ा गया?", ["1526", "1556", "1761", "1857"], 0, "1526 में।"),
    ("GK", "Indian History", "दीन-ए-इलाही किसने चलाया?", ["अकबर", "जहाँगीर", "शाहजहाँ", "औरंगज़ेब"], 0, "अकबर ने।"),
    ("GK", "Indian History", "भारत छोड़ो आंदोलन कब शुरू हुआ?", ["1940", "1942", "1945", "1947"], 1, "1942 में।"),
    ("GK", "Indian History", "महात्मा गांधी का जन्म कब हुआ?", ["1869", "1879", "1889", "1899"], 0, "2 अक्टूबर 1869।"),
    ("GK", "Indian History", "अकबर का संरक्षक कौन था?", ["बैरम खान", "टोडरमल", "मानसिंग", "अबुल फजल"], 0, "बैरम खान।"),
    ("GK", "Indian History", "हड़प्पा सभ्यता किस नदी के किनारे विकसित हुई?", ["गंगा", "यमुना", "सिंधु", "गोदावरी"], 2, "सिंधु नदी।"),
    ("GK", "Indian History", "भारत में ब्रिटिश ईस्ट इंडिया कंपनी की स्थापना कब हुई?", ["1600", "1605", "1610", "1620"], 0, "1600 में।"),
    ("GK", "Indian History", "स्वराज्य की स्थापना किसने की?", ["गोखले", "तिलक", "शिवाजी", "राणा प्रताप"], 2, "शिवाजी ने।"),
    ("GK", "Indian History", "भारत में पहला सूती कपड़ा मिल कहाँ लगा?", ["मुंबई", "अहमदाबाद", "कानपुर", "सूरत"], 0, "1854 में मुंबई में।"),
    ("GK", "Indian History", "बंगाल विभाजन कब हुआ?", ["1905", "1906", "1907", "1908"], 0, "1905 में।"),
    ("GK", "Indian History", "साइमन कमीशन का भारत आगमन?", ["1927", "1928", "1929", "1930"], 1, "1928 में।"),
    ("GK", "Indian History", "जलियांवाला बाग हत्याकांड कब हुआ?", ["1917", "1918", "1919", "1920"], 2, "1919 में।"),
    ("GK", "Indian History", "भारत का राष्ट्रगान 'जन गण मन' किसने लिखा?", ["रवींद्रनाथ टैगोर", "बंकिमचंद्र", "सुभाषचंद्र", "महात्मा गांधी"], 0, "रवींद्रनाथ टैगोर।"),

    # ---------------- Maths : Arithmetic ----------------
    ("Maths", "Arithmetic", "15 × 12 = ?", ["150", "170", "180", "200"], 2, "180।"),
    ("Maths", "Arithmetic", "√144 = ?", ["10", "11", "12", "14"], 2, "12।"),
    ("Maths", "Arithmetic", "25% of 200 = ?", ["25", "50", "75", "100"], 1, "50।"),
    ("Maths", "Arithmetic", "125 ÷ 5 = ?", ["20", "25", "30", "35"], 1, "25।"),
    ("Maths", "Arithmetic", "7² + 3² = ?", ["49", "58", "67", "70"], 1, "58।"),
    ("Maths", "Arithmetic", "10% of 500 = ?", ["50", "60", "70", "80"], 0, "50।"),
    ("Maths", "Arithmetic", "2000 का 5% कितना होगा?", ["50", "100", "150", "200"], 1, "100।"),
    ("Maths", "Arithmetic", "यदि एक वस्तु का मूल्य 300 रु से 360 रु हो जाए तो % वृद्धि?", ["10%", "15%", "20%", "25%"], 2, "20%।"),
    ("Maths", "Arithmetic", "यदि किसी संख्या का 40%, 80 है तो संख्या क्या है?", ["120", "160", "200", "240"], 2, "200।"),
    ("Maths", "Arithmetic", "300 का 33⅓% कितना?", ["100", "110", "120", "130"], 0, "100।"),
    ("Maths", "Arithmetic", "एक संख्या का 15% यदि 45 हो तो संख्या?", ["200", "250", "300", "350"], 2, "300।"),
    ("Maths", "Arithmetic", "₹500 का 20% लाभ कितना?", ["₹50", "₹75", "₹100", "₹125"], 2, "₹100।"),
    ("Maths", "Arithmetic", "यदि A का 25% = 50 हो, तो A = ?", ["100", "150", "200", "250"], 2, "200।"),
    ("Maths", "Arithmetic", "एक घंटे का कितना % 15 मिनट है?", ["15%", "20%", "25%", "30%"], 2, "25%।"),
    ("Maths", "Arithmetic", "250 का 8% कितना?", ["15", "18", "20", "22"], 2, "20।"),
    ("Maths", "Arithmetic", "यदि संख्या 800 है और 20% घटे तो नई संख्या?", ["600", "620", "640", "660"], 2, "640।"),
    ("Maths", "Arithmetic", "10% वार्षिक ब्याज पर 2 वर्ष का साधारण ब्याज ₹400 है तो मूलधन?", ["₹1500", "₹2000", "₹2500", "₹3000"], 1, "₹2000।"),
    ("Maths", "Arithmetic", "15 पुस्तकों का मूल्य ₹1200 है तो 5 का मूल्य?", ["₹300", "₹350", "₹400", "₹450"], 2, "₹400।"),
    ("Maths", "Arithmetic", "80 किमी/घंटा से 240 किमी दूरी तय करने में समय?", ["2 h", "3 h", "4 h", "5 h"], 1, "3 घंटे।"),
    ("Maths", "Arithmetic", "12 आदमी 15 दिन में काम खत्म करते हैं, 20 आदमी कितने दिन लेंगे?", ["7", "8", "9", "10"], 2, "9 दिन।"),

    # ---------------- Maths : Geometry ----------------
    ("Maths", "Geometry", "त्रिभुज के तीनों कोणों का योग?", ["90°", "180°", "270°", "360°"], 1, "180°।"),
    ("Maths", "Geometry", "एक वृत्त का परिमाप सूत्र?", ["2πr", "πr²", "πd", "4r²"], 0, "2πr।"),
    ("Maths", "Geometry", "आयत का क्षेत्रफल?", ["l + b", "l × b", "2(l + b)", "l² + b²"], 1, "l × b।"),
    ("Maths", "Geometry", "वर्ग की भुजा 5 सेमी है तो क्षेत्रफल?", ["10", "20", "25", "30"], 2, "25 वर्ग सेमी।"),
    ("Maths", "Geometry", "एक वृत्त की त्रिज्या 7 सेमी है तो क्षेत्रफल?", ["44", "77", "154", "308"], 2, "154 वर्ग सेमी।"),
    ("Maths", "Geometry", "समकोण त्रिभुज में हाइपोटेनस = ?", ["a² + b²", "√(a² + b²)", "2√ab", "(a + b)²"], 1, "√(a² + b²)।"),
    ("Maths", "Geometry", "एक घन की भुजा 3 सेमी है तो आयतन?", ["9", "18", "27", "36"], 2, "27 घन सेमी।"),
    ("Maths", "Geometry", "दो समांतर रेखाएं आपस में मिलती हैं?", ["कभी", "हमेशा", "कभी-कभी", "कभी नहीं"], 3, "कभी नहीं।"),
    ("Maths", "Geometry", "एक बेलन का आयतन सूत्र?", ["πr²h", "2πrh", "πrh²", "πr²h²"], 0, "πr²h।"),
    ("Maths", "Geometry", "एक पिरामिड का आयतन = (1/3) × ?", ["आधार × ऊंचाई", "आधार² × ऊंचाई", "आधार × ऊंचाई²", "3 × आधार × ऊंचाई"], 0, "(1/3) × आधार × ऊंचाई।"),
    ("Maths", "Geometry", "एक पंचभुज के कोणों का योग?", ["360°", "540°", "720°", "900°"], 1, "540°।"),
    ("Maths", "Geometry", "एक गोले का आयतन?", ["(4/3)πr³", "4πr²", "(2/3)πr³", "(1/3)πr²"], 0, "(4/3)πr³।"),
    ("Maths", "Geometry", "शंकु का आयतन?", ["(1/3)πr²h", "πr²h", "(2/3)πr²h", "(1/2)πr²h"], 0, "(1/3)πr²h।"),
    ("Maths", "Geometry", "एक चतुर्भुज का कोण योग?", ["180°", "270°", "360°", "450°"], 2, "360°।"),
    ("Maths", "Geometry", "सीधी रेखा की ढलान = ?", ["y/x", "Δy/Δx", "x/y", "(y₂+y₁)/(x₂+x₁)"], 1, "Δy/Δx।"),
    ("Maths", "Geometry", "वृत्त का क्षेत्रफल?", ["πr", "πr²", "2πr", "πd"], 1, "πr²।"),
    ("Maths", "Geometry", "त्रिभुज का क्षेत्रफल = ?", ["(1/2)bh", "bh", "b + h", "2bh"], 0, "(1/2) × base × height।"),
    ("Maths", "Geometry", "समबाहु त्रिभुज का प्रत्येक कोण?", ["45°", "60°", "90°", "120°"], 1, "60°।"),
    ("Maths", "Geometry", "पाइथागोरस प्रमेय a² + b² = ?", ["c", "c²", "2c", "√c"], 1, "c²।"),
    ("Maths", "Geometry", "एक वृत्त में 360° का कौन सा कोण होता है?", ["केंद्रीय कोण", "परिधीय कोण", "समकोण", "ऋणात्मक कोण"], 0, "पूर्ण केंद्रीय कोण।"),

    # ---------------- English : Noun ----------------
    ("English", "Noun", "Which is a noun?", ["Run", "Beautiful", "Cat", "Quickly"], 2, "'Cat' is a noun."),
    ("English", "Noun", "Identify the noun: 'The sun is bright.'", ["The", "sun", "is", "bright"], 1, "'Sun' is a noun."),
    ("English", "Noun", "Which is a proper noun?", ["city", "Delhi", "boy", "river"], 1, "'Delhi' is a proper noun."),
    ("English", "Noun", "Plural of 'child'?", ["childs", "childes", "children", "childrens"], 2, "Children."),
    ("English", "Noun", "Collective noun for sheep?", ["herd", "flock", "pack", "swarm"], 1, "Flock of sheep."),
    ("English", "Noun", "Which word is an abstract noun?", ["table", "happiness", "apple", "car"], 1, "'Happiness' is abstract."),
    ("English", "Noun", "Find the noun: 'She bought a new dress.'", ["She", "bought", "new", "dress"], 3, "'Dress' is the noun."),
    ("English", "Noun", "Feminine gender of 'actor'?", ["actress", "actoress", "actorine", "actora"], 0, "Actress."),
    ("English", "Noun", "Identify the common noun: 'The Ganga is a holy river.'", ["Ganga", "holy", "river", "The"], 2, "'River' is common."),
    ("English", "Noun", "Which is an uncountable noun?", ["book", "water", "pen", "chair"], 1, "Water."),
    ("English", "Noun", "Material noun: 'This ring is made of gold.'", ["ring", "is", "made", "gold"], 3, "'Gold'."),
    ("English", "Noun", "Plural of 'mouse'?", ["mouses", "mice", "mices", "mouse"], 1, "Mice."),
    ("English", "Noun", "Collective noun example?", ["team", "boy", "cat", "table"], 0, "'Team' is collective."),
    ("English", "Noun", "Noun form of 'strong'?", ["strongly", "strength", "stronger", "strongest"], 1, "Strength."),
    ("English", "Noun", "Countable noun?", ["rice", "air", "bottle", "milk"], 2, "Bottle."),
    ("English", "Noun", "Possessive noun: 'This is Rahul's book.'", ["Rahul", "Rahul's", "book", "This"], 1, "'Rahul's'."),
    ("English", "Noun", "Type of noun: 'army'?", ["Abstract", "Common", "Collective", "Proper"], 2, "Collective."),
    ("English", "Noun", "Plural of 'tooth'?", ["tooths", "teeth", "toothes", "teeths"], 1, "Teeth."),
    ("English", "Noun", "Which is NOT a noun?", ["city", "run", "freedom", "chair"], 1, "'Run' is a verb."),
    ("English", "Noun", "Plural of 'foot'?", ["foots", "feet", "feets", "foot"], 1, "Feet."),

    # ---------------- Reasoning : Series ----------------
    ("Reasoning", "Series", "2, 4, 8, 16, ?", ["18", "24", "32", "30"], 2, "Double each term."),
    ("Reasoning", "Series", "1, 4, 9, 16, ?", ["20", "25", "30", "36"], 1, "Squares: 5²=25."),
    ("Reasoning", "Series", "5, 10, 15, 20, ?", ["22", "24", "25", "30"], 2, "+5 each time."),
    ("Reasoning", "Series", "3, 6, 12, 24, ?", ["36", "42", "48", "54"], 2, "Doubling."),
    ("Reasoning", "Series", "1, 1, 2, 3, 5, ?", ["6", "7", "8", "9"], 2, "Fibonacci: 8."),
    ("Reasoning", "Series", "A, C, E, G, ?", ["H", "I", "J", "K"], 1, "Every second letter."),
    ("Reasoning", "Series", "Z, X, V, T, ?", ["R", "S", "Q", "P"], 0, "Reverse, skip one."),
    ("Reasoning", "Series", "AB, EF, IJ, ?", ["MN", "OP", "MNOP", "QR"], 0, "Pairs every 4 steps."),
    ("Reasoning", "Series", "1, 3, 6, 10, ?", ["12", "14", "15", "16"], 2, "Triangular numbers."),
    ("Reasoning", "Series", "0, 1, 1, 2, 3, 5, ?", ["6", "7", "8", "9"], 2, "Fibonacci."),
    ("Reasoning", "Series", "2, 5, 10, 17, ?", ["24", "26", "28", "30"], 1, "n²+1."),
    ("Reasoning", "Series", "100, 81, 64, 49, ?", ["36", "25", "16", "9"], 0, "Squares descending."),
    ("Reasoning", "Series", "B, D, F, H, ?", ["I", "J", "K", "L"], 1, "Every second letter."),
    ("Reasoning", "Series", "1, 8, 27, 64, ?", ["100", "125", "150", "175"], 1, "Cubes."),
    ("Reasoning", "Series", "12, 10, 8, 6, ?", ["3", "4", "5", "2"], 1, "-2."),
    ("Reasoning", "Series", "1, 1, 2, 6, 24, ?", ["48", "60", "72", "120"], 3, "Factorial."),
    ("Reasoning", "Series", "10, 20, 40, 80, ?", ["100", "120", "140", "160"], 3, "Double."),
    ("Reasoning", "Series", "A, E, I, M, ?", ["N", "O", "P", "Q"], 2, "Every 4th."),
    ("Reasoning", "Series", "1, 2, 6, 24, 120, ?", ["240", "360", "480", "720"], 3, "Factorial."),
    ("Reasoning", "Series", "Z, Y, X, W, ?", ["V", "U", "T", "S"], 0, "Reverse."),

    # ---------------- Science : Physics ----------------
    ("Science", "Physics", "प्रकाश की गति (m/s)?", ["3×10⁶", "3×10⁸", "3×10¹⁰", "3×10⁴"], 1, "≈ 3×10⁸ m/s"),
    ("Science", "Physics", "गुरुत्वाकर्षण की खोज किसने की?", ["आइंस्टीन", "न्यूटन", "गैलीलियो", "एडिसन"], 1, "आइज़क न्यूटन।"),
    ("Science", "Physics", "बल का SI मात्रक?", ["जूल", "न्यूटन", "वाट", "पास्कल"], 1, "Newton (N)"),
    ("Science", "Physics", "पावर का मात्रक?", ["जूल", "न्यूटन", "वाट", "एम्पीयर"], 2, "Watt"),
    ("Science", "Physics", "ध्वनि की गति (हवा में)?", ["343 m/s", "3000 m/s", "30 m/s", "3×10⁸ m/s"], 0, "≈ 343 m/s"),
    ("Science", "Physics", "1 N बराबर है?", ["1 kg m/s²", "1 kg m/s", "1 g m/s²", "1 kg cm/s²"], 0, "F=ma ⇒ 1 N = 1 kg·m/s²"),
    ("Science", "Physics", "प्रकाश वर्ष किसका मात्रक है?", ["समय", "दूरी", "चाल", "द्रव्यमान"], 1, "दूरी।"),
    ("Science", "Physics", "विद्युत धारा का मात्रक?", ["वोल्ट", "एम्पीयर", "ओम", "वाट"], 1, "एम्पीयर (A)"),
    ("Science", "Physics", "g का मान लगभग?", ["8.9 m/s²", "9.8 m/s²", "10.8 m/s²", "7.8 m/s²"], 1, "9.8 m/s²"),
    ("Science", "Physics", "1 L = ? mL", ["100", "500", "1000", "1500"], 2, "1000 mL"),
    ("Science", "Physics", "पारसेक किसकी इकाई है?", ["समय", "दूरी", "द्रव्यमान", "ऊर्जा"], 1, "खगोलीय दूरी।"),
    ("Science", "Physics", "ध्वनि तरंग किस प्रकार की है?", ["अनुप्रस्थ", "अनुदैर्ध्य", "विद्युत चुम्बकीय", "यांत्रिक नहीं"], 1, "अनुदैर्ध्य यांत्रिक तरंग।"),
    ("Science", "Physics", "प्रतिध्वनि के लिए न्यूनतम दूरी?", ["10 m", "17 m", "20 m", "25 m"], 1, "लगभग 17 m।"),
    ("Science", "Physics", "ऊष्मा का SI मात्रक?", ["जूल", "कैलोरी", "वाट", "न्यूटन"], 0, "जूल (J)"),
    ("Science", "Physics", "तरंग दैर्ध्य का प्रतीक?", ["α", "β", "λ", "γ"], 2, "λ (लैम्ब्डा)"),
    ("Science", "Physics", "सूर्य का प्रकाश पृथ्वी तक आने में समय?", ["8 मिनट", "1 सेकंड", "1 घंटा", "24 घंटे"], 0, "≈ 8 मिनट 20 सेकंड।"),
    ("Science", "Physics", "पानी का क्वथनांक किस पर निर्भर?", ["द्रव्यमान", "वायुमंडलीय दबाव", "आयतन", "रंग"], 1, "दबाव।"),
    ("Science", "Physics", "इंद्रधनुष में कितने रंग?", ["5", "6", "7", "8"], 2, "7 (VIBGYOR)"),
    ("Science", "Physics", "सूर्य ग्रहण कब होता है?", ["पूर्णिमा", "अमावस्या", "दोनों", "कभी नहीं"], 1, "अमावस्या पर।"),
    ("Science", "Physics", "चंद्र ग्रहण कब होता है?", ["पूर्णिमा", "अमावस्या", "दोनों", "कभी नहीं"], 0, "पूर्णिमा पर।"),
]


def init_db():
    with closing(get_db()) as db:
        db.executescript(SCHEMA)
        count = db.execute("SELECT COUNT(*) AS n FROM questions").fetchone()["n"]
        if count == 0:
            for cat, topic, question, options, correct, explanation in SEED_QUESTIONS:
                db.execute(
                    "INSERT INTO questions (category, topic, question, options, correct, explanation)"
                    " VALUES (?,?,?,?,?,?)",
                    (cat, topic, question, json.dumps(options, ensure_ascii=False),
                     correct, explanation),
                )
        db.commit()


# =====================================================================
# HELPERS
# =====================================================================

def shuffle_options(row):
    """Randomise option order and recompute the correct-answer index.

    `shuffle` maps display position -> original stored index, so the client
    can submit the ORIGINAL index for accurate server-side grading.
    """
    opts = json.loads(row["options"])
    indices = list(range(len(opts)))
    random.shuffle(indices)
    return {
        "question_id": row["id"],
        "category": row["category"],
        "topic": row["topic"],
        "question": row["question"],
        "options": [opts[i] for i in indices],
        "correct": indices.index(row["correct"]),
        "shuffle": indices,
        "explanation": row["explanation"],
    }


def update_user_stats(db, username, correct_count):
    """Bump XP / level / daily streak. Returns (prev_level, new_xp, new_streak)."""
    row = db.execute("SELECT * FROM user_stats WHERE username=?", (username,)).fetchone()
    prev_level = row["level"] if row else 1
    today = int(time.time() // 86400)

    if row and row["last_active"] == today:
        xp = row["xp"] + correct_count * 10
        streak = row["streak"]
    elif row and row["last_active"] == today - 1:
        xp = row["xp"] + correct_count * 10
        streak = row["streak"] + 1
    else:
        xp = (row["xp"] if row else 0) + correct_count * 10
        streak = 1

    level = min(99, xp // 100 + 1)
    if row:
        db.execute(
            "UPDATE user_stats SET xp=?, streak=?, last_active=?, level=? WHERE id=?",
            (xp, streak, today, level, row["id"]),
        )
    else:
        db.execute(
            "INSERT INTO user_stats (username, xp, streak, last_active, level) VALUES (?,?,?,?,?)",
            (username, xp, streak, today, level),
        )
    return prev_level, xp, streak


# =====================================================================
# API ROUTES
# =====================================================================

@app.route("/")
def index():
    return HTML


@app.route("/api/categories")
def get_categories():
    with closing(get_db()) as db:
        rows = db.execute(
            "SELECT category, COUNT(*) AS n FROM questions GROUP BY category ORDER BY n DESC"
        ).fetchall()
    return jsonify([{"category": r["category"], "count": r["n"]} for r in rows])


@app.route("/api/topics")
def get_topics():
    category = request.args.get("category")
    if not category:
        return jsonify([])
    with closing(get_db()) as db:
        rows = db.execute(
            "SELECT topic, COUNT(*) AS n FROM questions WHERE category=? GROUP BY topic ORDER BY n DESC",
            (category,),
        ).fetchall()
    return jsonify([{"topic": r["topic"], "count": r["n"]} for r in rows])


@app.route("/api/start-test", methods=["POST"])
def start_test():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "guest").strip()
    category = data.get("category")
    topic = data.get("topic")
    mode = data.get("mode", "normal")
    limit = int(data.get("limit", 20))

    with closing(get_db()) as db:
        if mode == "normal":
            if not topic:
                return jsonify(error="Pick a topic first."), 400
            rows = db.execute(
                "SELECT * FROM questions WHERE category=? AND topic=?",
                (category or "", topic),
            ).fetchall()
            if len(rows) < limit:
                return jsonify(error=f"Only {len(rows)} questions here — pick a smaller test."), 400
        elif mode == "all":
            rows = db.execute(
                "SELECT * FROM questions WHERE category=?", (category or "",)
            ).fetchall()
        elif mode in ("weak", "hard"):
            min_wrong = 2 if mode == "hard" else 1
            rows = db.execute(
                "SELECT q.* FROM questions q JOIN weak_questions w ON w.question_id=q.id"
                " WHERE w.username=? AND w.wrong_count>=?",
                (username, min_wrong),
            ).fetchall()
            if not rows:
                msg = ("Nothing to drill yet — no questions missed twice." if mode == "hard"
                       else "No weak questions yet — take a test first!")
                return jsonify(error=msg), 404
        else:
            return jsonify(error="Unknown mode"), 400

        random.shuffle(rows)
        rows = rows[:limit]
        if not rows:
            return jsonify(error="No questions found."), 404

        questions = [shuffle_options(r) for r in rows]
        per_q = 60 if mode in ("weak", "hard") else 30
        timer_sec = max(60, len(questions) * per_q)

    return jsonify(questions=questions, timer_sec=timer_sec, mode=mode)


@app.route("/api/submit-test", methods=["POST"])
def submit_test():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "guest").strip()
    answers = data.get("answers") or []
    category = data.get("category", "")
    topic = data.get("topic", "")
    mode = data.get("mode", "normal")
    time_sec = int(data.get("time_sec", 0))
    now_ms = int(time.time() * 1000)

    with closing(get_db()) as db:
        correct = wrong = skipped = 0
        for a in answers:
            q = db.execute("SELECT * FROM questions WHERE id=?", (a.get("question_id"),)).fetchone()
            if not q:
                continue
            sel = a.get("selected")
            if sel is None:
                skipped += 1
            elif sel == q["correct"]:
                correct += 1
                if mode == "hard":
                    db.execute(
                        "UPDATE weak_questions SET wrong_count=1"
                        " WHERE username=? AND question_id=? AND wrong_count>=2",
                        (username, q["id"]),
                    )
            else:
                wrong += 1
                weak = db.execute(
                    "SELECT * FROM weak_questions WHERE username=? AND question_id=?",
                    (username, q["id"]),
                ).fetchone()
                if weak:
                    db.execute(
                        "UPDATE weak_questions SET wrong_count=wrong_count+1, last_wrong=? WHERE id=?",
                        (now_ms, weak["id"]),
                    )
                else:
                    db.execute(
                        "INSERT INTO weak_questions (username, question_id, wrong_count, last_wrong)"
                        " VALUES (?,?,1,?)",
                        (username, q["id"], now_ms),
                    )

        total = len(answers)
        pct = round(correct / total * 100, 2) if total else 0
        prev_level, new_xp, new_streak = update_user_stats(db, username, correct)

        db.execute(
            "INSERT INTO attempts (username, category, topic, total, correct, wrong, skipped,"
            " pct, time_sec, mode, ts) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (username, category, topic, total, correct, wrong, skipped,
             pct, time_sec, mode, now_ms),
        )
        db.commit()

    new_level = min(99, new_xp // 100 + 1)
    return jsonify(
        correct=correct, wrong=wrong, skipped=skipped, total=total, pct=pct,
        time_sec=time_sec, xp_earned=correct * 10, new_xp=new_xp,
        new_level=new_level, new_streak=new_streak, is_level_up=new_level > prev_level,
    )


@app.route("/api/results")
def recent_results():
    username = request.args.get("username")
    if not username:
        return jsonify([])
    with closing(get_db()) as db:
        rows = db.execute(
            "SELECT * FROM attempts WHERE username=? ORDER BY ts DESC LIMIT 20", (username,)
        ).fetchall()
    return jsonify([{
        "id": r["id"], "category": r["category"], "topic": r["topic"],
        "total": r["total"], "correct": r["correct"], "wrong": r["wrong"],
        "skipped": r["skipped"], "pct": r["pct"], "time_sec": r["time_sec"],
        "mode": r["mode"], "ts": r["ts"],
    } for r in rows])


@app.route("/api/stats")
def user_stats():
    username = request.args.get("username")
    if not username:
        return jsonify(total_questions=0, total_tests=0, avg_pct=0, weak_count=0,
                       xp=0, level=1, streak=0, xp_into_level=0)
    with closing(get_db()) as db:
        total_q = db.execute("SELECT COUNT(*) AS n FROM questions").fetchone()["n"]
        attempts = db.execute(
            "SELECT pct FROM attempts WHERE username=?", (username,)
        ).fetchall()
        total_tests = len(attempts)
        avg_pct = round(sum(a["pct"] for a in attempts) / total_tests, 1) if total_tests else 0
        weak_count = db.execute(
            "SELECT COUNT(*) AS n FROM weak_questions WHERE username=?", (username,)
        ).fetchone()["n"]
        row = db.execute("SELECT * FROM user_stats WHERE username=?", (username,)).fetchone()
    return jsonify(
        total_questions=total_q, total_tests=total_tests, avg_pct=avg_pct,
        weak_count=weak_count, xp=(row["xp"] if row else 0),
        level=(row["level"] if row else 1), streak=(row["streak"] if row else 0),
        xp_into_level=(row["xp"] % 100 if row else 0),
    )


@app.route("/api/analytics")
def user_analytics():
    username = request.args.get("username")
    if not username:
        return jsonify([])
    with closing(get_db()) as db:
        rows = db.execute(
            "SELECT category, SUM(total) AS total, SUM(correct) AS correct, COUNT(*) AS tests"
            " FROM attempts WHERE username=? GROUP BY category", (username,)
        ).fetchall()
    result = []
    for r in rows:
        total = r["total"] or 0
        accuracy = round((r["correct"] or 0) / total * 100, 1) if total else 0
        result.append({
            "category": r["category"], "accuracy": accuracy,
            "attempts": r["tests"], "answered": total, "correct": r["correct"] or 0,
        })
    result.sort(key=lambda x: -x["attempts"])
    return jsonify(result)


@app.route("/api/weak-questions/<username>")
def weak_questions_paginated(username):
    page = max(1, request.args.get("page", 1, type=int))
    page_size = 20
    offset = (page - 1) * page_size
    with closing(get_db()) as db:
        weaks = db.execute(
            "SELECT * FROM weak_questions WHERE username=?"
            " ORDER BY wrong_count DESC, last_wrong DESC LIMIT ? OFFSET ?",
            (username, page_size, offset),
        ).fetchall()
        total = db.execute(
            "SELECT COUNT(*) AS n FROM weak_questions WHERE username=?", (username,)
        ).fetchone()["n"]
        result = []
        for w in weaks:
            q = db.execute("SELECT * FROM questions WHERE id=?", (w["question_id"],)).fetchone()
            if not q:
                continue
            result.append({
                "weak_id": w["id"], "question_id": q["id"],
                "category": q["category"], "topic": q["topic"],
                "question": q["question"], "options": json.loads(q["options"]),
                "correct": q["correct"], "explanation": q["explanation"],
                "wrong_count": w["wrong_count"], "last_wrong": w["last_wrong"],
            })
    return jsonify(weak_questions=result, page=page,
                   total_pages=max(1, -(-total // page_size)), total=total)


# ---------- question bank management ----------

@app.route("/api/questions", methods=["GET", "POST"])
def questions_api():
    if request.method == "GET":
        with closing(get_db()) as db:
            rows = db.execute("SELECT * FROM questions ORDER BY id").fetchall()
        return jsonify([{
            "id": r["id"], "category": r["category"], "topic": r["topic"],
            "question": r["question"], "options": json.loads(r["options"]),
            "correct": r["correct"], "explanation": r["explanation"],
        } for r in rows])
    data = request.get_json(force=True)
    if not isinstance(data, list):
        return jsonify(error="Expected a list of questions"), 400
    with closing(get_db()) as db:
        for item in data:
            db.execute(
                "INSERT INTO questions (category, topic, question, options, correct, explanation)"
                " VALUES (?,?,?,?,?,?)",
                (item.get("category", "GK"), item.get("topic", "General"),
                 item["question"], json.dumps(item["options"], ensure_ascii=False),
                 int(item["correct"]), item.get("explanation", "")),
            )
        db.commit()
    return jsonify(status="ok", added=len(data))


@app.route("/api/questions/<int:qid>", methods=["DELETE"])
def delete_question(qid):
    with closing(get_db()) as db:
        db.execute("DELETE FROM weak_questions WHERE question_id=?", (qid,))
        cur = db.execute("DELETE FROM questions WHERE id=?", (qid,))
        db.commit()
    if cur.rowcount == 0:
        return jsonify(error="Not found"), 404
    return jsonify(status="ok")


@app.route("/api/import-questions", methods=["POST"])
def import_questions():
    data = request.get_json(force=True) or {}
    category = data.get("category", "GK")
    auto_split = data.get("auto_split", True)
    qlist = data.get("questions", [])
    if not qlist:
        return jsonify(error="No questions provided"), 400
    for q in qlist:
        if not all(k in q for k in ("question", "options", "correct")):
            return jsonify(error="Invalid question format — need question, options, correct"), 400
        if len(q["options"]) != 4:
            return jsonify(error="Each question must have exactly 4 options"), 400

    with closing(get_db()) as db:
        existing = db.execute(
            "SELECT topic FROM questions WHERE category=? AND topic LIKE 'Test %'", (category,)
        ).fetchall()
        max_test = 0
        for r in existing:
            try:
                max_test = max(max_test, int(r["topic"].replace("Test ", "")))
            except ValueError:
                pass

        added = 0
        if auto_split:
            for i in range(0, len(qlist), 20):
                chunk = qlist[i:i + 20]
                topic = f"Test {max_test + (i // 20) + 1}"
                for q in chunk:
                    db.execute(
                        "INSERT INTO questions (category, topic, question, options, correct, explanation)"
                        " VALUES (?,?,?,?,?,?)",
                        (category, topic, q["question"],
                         json.dumps(q["options"], ensure_ascii=False),
                         int(q["correct"]), q.get("explanation", "")),
                    )
                    added += 1
        else:
            for q in qlist:
                db.execute(
                    "INSERT INTO questions (category, topic, question, options, correct, explanation)"
                    " VALUES (?,?,?,?,?,?)",
                    (category, q.get("topic", "Imported"), q["question"],
                     json.dumps(q["options"], ensure_ascii=False),
                     int(q["correct"]), q.get("explanation", "")),
                )
                added += 1
        db.commit()
    return jsonify(status="ok", added=added)


@app.route("/api/clear-all", methods=["DELETE"])
def clear_all_questions():
    with closing(get_db()) as db:
        db.execute("DELETE FROM weak_questions")
        db.execute("DELETE FROM questions")
        db.commit()
    return jsonify(status="ok")


@app.route("/api/export-all", methods=["POST"])
def export_all():
    data = request.get_json(force=True) or {}
    password = data.get("password", "")
    if hashlib.sha256(password.encode()).hexdigest() != EXPORT_PASSWORD_HASH:
        return jsonify(error="Invalid password"), 401
    with closing(get_db()) as db:
        rows = db.execute("SELECT * FROM questions ORDER BY id").fetchall()
    export_data = [{
        "category": r["category"], "topic": r["topic"], "question": r["question"],
        "options": json.loads(r["options"]), "correct": r["correct"],
        "explanation": r["explanation"],
    } for r in rows]
    bio = BytesIO(json.dumps(export_data, ensure_ascii=False, indent=2).encode("utf-8"))
    bio.seek(0)
    return send_file(
        bio, mimetype="application/json", as_attachment=True,
        download_name=f"questions_export_{time.strftime('%Y%m%d_%H%M%S')}.json",
    )


# =====================================================================
@app.route("/api/sync", methods=["POST"])
def github_sync():
    """Push or pull the question bank + user data via the sync.py bridge."""
    data = request.get_json(force=True) or {}
    action = data.get("action", "backup")
    if data.get("password", "") != EXPORT_PASSWORD:
        return jsonify(error="Invalid password"), 401
    if sync is None or not sync.configured():
        return jsonify(error="GitHub sync not configured. Set GITHUB_TOKEN and GITHUB_REPO in Render -> Environment."), 400
    try:
        if action == "backup":
            result = sync.do_backup(force=True)
        elif action == "restore":
            result = sync.do_restore()
        else:
            return jsonify(error="Unknown action"), 400
        return jsonify(status="ok", result=result)
    except Exception as e:
        return jsonify(error=str(e)), 500


# FRONTEND (embedded single-file UI)
# =====================================================================

HTML = """<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>MockTest.pro — Level 99</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#f5f6fb; --card:#ffffff; --sunk:#eef0f8; --text:#1c2135; --text2:#5b6170; --muted:#8a90a3;
  --line:#e4e7f0; --line2:#cbd0e0; --brand:#4f46e5; --brand2:#8b5cf6; --accent:#f59e0b;
  --ok:#10b981; --oksoft:#d1fae5; --err:#ef4444; --errsoft:#fee2e2; --warn:#f59e0b; --warnsoft:#fef3c7;
  --shadow:0 1px 3px #1c213510,0 1px 2px #1c21350a;
  --shadowMd:0 4px 14px #1c213510; --shadowLg:0 14px 40px #1c21351a;
  --radius:16px; --font:'Plus Jakarta Sans',sans-serif; --mono:'JetBrains Mono',monospace;
}
[data-theme="dark"]{
  --bg:#0f1224; --card:#1a1e33; --sunk:#151830; --text:#eef0f8; --text2:#b3b8cb; --muted:#7c8196;
  --line:#272b41; --line2:#3a3f5c; --brand:#818cf8; --brand2:#a78bfa; --accent:#fbbf24;
  --ok:#34d399; --oksoft:rgba(52,211,153,.15); --err:#f87171; --errsoft:rgba(248,113,113,.15);
  --warnsoft:rgba(251,191,36,.15);
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh;line-height:1.5;transition:background .3s,color .3s;overflow-x:hidden}
.container{width:100%;max-width:1080px;margin:0 auto;padding:0 16px;position:relative;z-index:2}
button{font-family:inherit;cursor:pointer;border:0;background:none;color:inherit;transition:transform .1s ease,background .2s,border-color .2s,color .2s}
button:active{transform:scale(.96)}
input,textarea,select{font-family:inherit;font-size:16px;color:var(--text);width:100%}
a{color:var(--brand);text-decoration:none}
@keyframes fadeInUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes slideInRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
@keyframes popIn{0%{opacity:0;transform:scale(.9)}100%{opacity:1;transform:scale(1)}}
@keyframes blob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-50px) scale(1.1)}66%{transform:translate(-20px,20px) scale(.9)}}
@keyframes shimmer{0%{background-position:-468px 0}100%{background-position:468px 0}}
.bg-blob{position:fixed;border-radius:50%;filter:blur(90px);z-index:0;opacity:.35;pointer-events:none}
.blob-1{width:320px;height:320px;background:var(--brand);top:-60px;left:-60px;animation:blob 12s infinite ease-in-out}
.blob-2{width:280px;height:280px;background:var(--accent);bottom:-60px;right:-60px;animation:blob 15s infinite ease-in-out reverse}
.navbar{position:sticky;top:0;z-index:50;background:var(--card);border-bottom:1px solid var(--line);height:58px;display:flex;align-items:center;box-shadow:var(--shadow)}
.nav-wrap{display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.15rem}
.brand-dot{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef);position:relative;box-shadow:0 4px 10px rgba(99,102,241,.35)}
.brand-dot::after{content:"M";position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-weight:800;font-size:14px}
.nav-right{display:flex;align-items:center;gap:10px}
.user-chip{display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:50px;background:var(--sunk);font-size:.85rem;font-weight:600;cursor:pointer}
.dot-live{width:8px;height:8px;border-radius:50%;background:var(--ok);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.icon-btn{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--sunk);border:1px solid var(--line)}
.icon-btn:hover{background:var(--brand);color:#fff;border-color:var(--brand)}
[data-theme="light"] .i-moon,[data-theme="dark"] .i-sun{display:none}
.bottom-nav{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);z-index:45;padding:6px 0 calc(6px + env(safe-area-inset-bottom));justify-content:space-around;align-items:center;box-shadow:0 -6px 16px rgba(0,0,0,.05)}
.bottom-nav button{display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--muted);font-size:.62rem;padding:4px 0;font-weight:700}
.bottom-nav button.active{color:var(--brand)}
.bottom-nav button svg{width:22px;height:22px}
.screen{display:none;padding:24px 0 90px;animation:fadeInUp .35s ease}
.screen.active{display:block}
.hero{max-width:620px;margin:0 auto;text-align:center;padding:40px 16px}
.hero-tag{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;border-radius:100px;background:var(--sunk);border:1px solid var(--line);font-size:.85rem;font-weight:600;color:var(--text2);margin-bottom:20px}
.hero-title{font-size:clamp(2rem,7vw,3.2rem);font-weight:800;line-height:1.1;margin-bottom:12px}
.grad-word{background:linear-gradient(100deg,var(--brand),var(--brand2),var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.hero-sub{max-width:500px;margin:0 auto 24px;color:var(--text2);font-size:1rem}
.name-card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:24px;box-shadow:var(--shadowMd);text-align:left;margin-bottom:20px}
.name-card label{display:block;font-weight:700;margin-bottom:8px;color:var(--text2);text-transform:uppercase;font-size:.72rem;letter-spacing:.1em}
.name-row{display:flex;gap:10px;flex-wrap:wrap}
input,textarea,select{padding:13px 15px;border:1px solid var(--line2);border-radius:12px;background:var(--bg);font-size:1rem;outline:none;transition:border-color .2s,box-shadow .2s}
input:focus,textarea:focus,select:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(79,70,229,.18)}
.name-hint{font-size:.74rem;color:var(--muted);margin-top:8px}
.btn-primary{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border-radius:12px;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;font-weight:700;font-size:.98rem;box-shadow:0 4px 14px rgba(79,70,229,.3)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(79,70,229,.4)}
.btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:11px 18px;border-radius:12px;background:var(--card);color:var(--text);font-weight:600;font-size:.92rem;border:1px solid var(--line)}
.btn-ghost:hover{background:var(--sunk);border-color:var(--line2)}
.btn-danger{padding:11px 16px;border-radius:12px;background:var(--errsoft);color:var(--err);font-weight:700;border:1px solid transparent}
.btn-danger:hover{background:var(--err);color:#fff}
.hidden{display:none!important}
.page-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:22px}
.eyebrow{text-transform:uppercase;letter-spacing:.1em;font-size:.68rem;color:var(--muted);font-weight:700}
.page-title{font-size:1.9rem;font-weight:800}
.profile-card{background:linear-gradient(135deg,var(--brand),#7c3aed 60%,#9333ea);border-radius:24px;padding:24px;color:#fff;display:flex;justify-content:space-between;align-items:center;box-shadow:0 14px 34px rgba(79,70,229,.35);position:relative;overflow:hidden;margin-bottom:20px}
.profile-card::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.25) 1px,transparent 0);background-size:22px 22px;opacity:.5}
.pc-left h2{font-size:1.5rem;font-weight:800;margin-bottom:4px}
.pc-left p{font-size:.82rem;color:rgba(255,255,255,.85)}
.pc-right{text-align:center}
.level-badge{width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.5);backdrop-filter:blur(4px);display:grid;place-items:center;font-weight:800;font-size:1.5rem}
.pc-right span{font-size:.62rem;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.05em}
.chip{display:inline-flex;align-items:center;gap:6px;border-radius:50px;padding:4px 12px;background:rgba(255,255,255,.16);backdrop-filter:blur(4px);font-size:.76rem;font-weight:700;color:#fff}
.quick-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px}
@media(min-width:600px){.quick-stats{grid-template-columns:repeat(4,1fr)}}
.stat{padding:14px;background:var(--card);border:1px solid var(--line);border-radius:16px;text-align:center;box-shadow:var(--shadow)}
.stat b{display:block;font-size:1.5rem;font-weight:800;background:linear-gradient(135deg,var(--brand),var(--brand2));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.stat span{font-size:.66rem;color:var(--muted);text-transform:uppercase;font-weight:700}
.grid-2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:20px 0}
@media(min-width:600px){.grid-2{grid-template-columns:repeat(3,1fr)}}
.action-card{padding:18px;border-radius:22px;background:var(--card);border:1px solid var(--line);cursor:pointer;position:relative;overflow:hidden;text-align:left;width:100%;box-shadow:var(--shadow)}
.action-card:hover{transform:translateY(-3px);box-shadow:var(--shadowLg);border-color:var(--brand)}
.ac-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;margin-bottom:10px;color:#fff;font-size:1.15rem}
.g1{background:linear-gradient(135deg,#6366f1,#8b5cf6)}.g2{background:linear-gradient(135deg,#f59e0b,#f97316)}
.g3{background:linear-gradient(135deg,#10b981,#06b6d4)}.g4{background:linear-gradient(135deg,#ef4444,#f97316)}
.g5{background:linear-gradient(135deg,#8b5cf6,#ec4899)}.g6{background:linear-gradient(135deg,#06b6d4,#3b82f6)}
.action-card h3{font-size:.98rem;margin-bottom:4px;font-weight:800}
.action-card p{color:var(--text2);font-size:.78rem;margin:0}
.ac-arrow{position:absolute;right:14px;top:14px;font-size:1.15rem;color:var(--muted);transition:.3s}
.action-card:hover .ac-arrow{transform:translateX(6px);color:var(--brand)}
.section-h{font-weight:800;font-size:.8rem;color:var(--text2);letter-spacing:.05em;text-transform:uppercase;margin:24px 0 10px}
.subtopic-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.subtopic-tile{padding:15px;border-radius:16px;background:var(--card);border:1px solid var(--line);cursor:pointer;text-align:left;width:100%;box-shadow:var(--shadow)}
.subtopic-tile:hover{transform:translateY(-2px);border-color:var(--brand);box-shadow:var(--shadowMd)}
.subtopic-tile h4{font-size:.9rem;margin-bottom:4px;font-weight:800}
.subtopic-tile span{font-size:.7rem;color:var(--muted)}
.empty{padding:22px;text-align:center;color:var(--muted);border:1.5px dashed var(--line2);border-radius:14px;background:var(--sunk)}
.recent-list{display:grid;gap:10px}
.recent-item{display:flex;justify-content:space-between;align-items:center;padding:13px 15px;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}
.ri-left{display:flex;align-items:center;gap:12px}
.ri-badge{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;font-weight:800;font-size:.95rem;color:#fff;flex-shrink:0}
.ri-badge.ok{background:linear-gradient(135deg,#10b981,#06b6d4)}.ri-badge.avg{background:linear-gradient(135deg,#f59e0b,#f97316)}.ri-badge.bad{background:linear-gradient(135deg,#ef4444,#f97316)}
.recent-item h5{font-size:.88rem;margin:0}.recent-item small{color:var(--muted);font-size:.72rem}
.skeleton-card{background:var(--sunk);border-radius:16px;height:80px;width:100%;background-image:linear-gradient(90deg,var(--sunk) 0px,var(--card) 40px,var(--sunk) 80px);background-size:600px;animation:shimmer 1.4s infinite linear}
.test-topbar{background:var(--card);border-bottom:1px solid var(--line);padding:10px 0;position:sticky;top:0;z-index:30}
.test-topwrap{display:flex;align-items:center;gap:10px}
.tp-progress{flex:1;display:flex;align-items:center;gap:8px;font-weight:700;font-size:.9rem;min-width:0}
.tp-bar{flex:1;max-width:150px;height:6px;background:var(--sunk);border-radius:50px;overflow:hidden}
.tp-bar span{display:block;height:100%;background:linear-gradient(90deg,var(--brand),var(--brand2));border-radius:50px;transition:width .4s}
.tp-timer{padding:7px 12px;border-radius:10px;font-family:var(--mono);font-weight:700;background:var(--sunk);font-size:.9rem;border:1px solid var(--line)}
.tp-timer.warn{color:var(--err);border-color:var(--err);animation:pulse 1s infinite}
.test-body{padding-top:20px}
.question-card{background:var(--card);border:1px solid var(--line);border-radius:24px;padding:24px;box-shadow:var(--shadowMd)}
.q-card-animate{animation:slideInRight .28s ease-out}
.q-cat-top{display:inline-block;padding:4px 12px;border-radius:20px;font-size:.72rem;font-weight:800;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;margin-bottom:12px}
.q-text-lg{font-size:clamp(1.05rem,2.5vw,1.35rem);font-weight:800;margin:0 0 18px;line-height:1.4}
.opt-list{display:grid;gap:9px}
.opt{display:flex;align-items:center;gap:12px;padding:13px 15px;border:2px solid var(--line2);border-radius:14px;background:var(--bg);font-weight:600;font-size:.95rem;text-align:left;width:100%}
.opt:hover:not(:disabled){border-color:var(--brand);transform:translateX(2px)}
.opt:disabled{opacity:.95;cursor:default}
.opt .kbd{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--sunk);border:1px solid var(--line);font-weight:800;font-size:13px;color:var(--text2);flex-shrink:0}
.opt.correct{border-color:var(--ok);background:var(--oksoft)}.opt.correct .kbd{background:var(--ok);color:#fff;border-color:var(--ok)}
.opt.wrong{border-color:var(--err);background:var(--errsoft)}.opt.wrong .kbd{background:var(--err);color:#fff;border-color:var(--err)}
.explanation{margin-top:14px;padding:13px;background:rgba(245,158,11,.08);border-left:4px solid var(--accent);border-radius:10px;color:var(--text2);font-size:.9rem;animation:fadeInUp .3s ease}
.test-actions{display:flex;justify-content:space-between;gap:8px;margin-top:16px}
.palette{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px}
.palette button{width:30px;height:30px;border-radius:9px;font-size:.7rem;font-weight:800;border:1px solid var(--line);background:var(--card);color:var(--muted)}
.palette button.cur{background:var(--brand);color:#fff;border-color:var(--brand)}
.palette button.done{background:var(--ok);color:#fff;border-color:var(--ok)}
.xp-popup{position:fixed;top:22%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;padding:18px 30px;border-radius:16px;font-weight:800;font-size:1.4rem;box-shadow:0 12px 34px rgba(0,0,0,.25);z-index:200;animation:popIn .4s ease, fadeOut 1s ease 1.4s forwards;opacity:0}
@keyframes fadeOut{to{opacity:0;visibility:hidden}}
.result-hero{max-width:560px;margin:auto;text-align:center;padding:28px 16px;background:var(--card);border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadowLg)}
.result-emoji{font-size:3.4rem;animation:popIn .7s}
.result-hero h2{font-size:1.7rem;font-weight:800;margin-bottom:6px}
.ring-wrap{position:relative;width:160px;height:160px;margin:20px auto}
.ring{width:100%;height:100%;transform:rotate(-90deg)}
.ring-bg{fill:none;stroke:var(--sunk);stroke-width:10}.ring-fg{fill:none;stroke:url(#gradRing);stroke-width:10;stroke-linecap:round;stroke-dasharray:267;stroke-dashoffset:267;transition:stroke-dashoffset 1.1s}
.ring-center{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center}
.ring-center b{font-size:2rem;font-weight:800}.ring-center span{font-size:.66rem;color:var(--muted);text-transform:uppercase}
.result-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0}
@media(max-width:420px){.result-grid{grid-template-columns:repeat(2,1fr)}}
.result-grid>div{padding:12px;background:var(--sunk);border:1px solid var(--line);border-radius:14px;animation:fadeInUp .5s ease backwards}
.result-grid>div:nth-child(2){animation-delay:.1s}.result-grid>div:nth-child(3){animation-delay:.2s}.result-grid>div:nth-child(4){animation-delay:.3s}
.result-grid b{display:block;font-size:1.35rem}.result-grid span{font-size:.64rem;color:var(--muted);text-transform:uppercase;font-weight:700}
.result-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:20px}
.xp-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding:14px 18px;border-radius:16px;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;text-align:left}
.review-list{margin-top:20px;display:grid;gap:10px}
.review-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:15px;text-align:left;animation:fadeInUp .4s ease}
.rc-status{padding:2px 10px;border-radius:20px;font-size:.64rem;font-weight:800;text-transform:uppercase}
.rc-status.ok{background:var(--oksoft);color:var(--ok)}.rc-status.no{background:var(--errsoft);color:var(--err)}.rc-status.sk{background:var(--sunk);color:var(--muted)}
.review-card .rc-q{font-weight:800;margin:8px 0;font-size:.9rem;line-height:1.45}
.rc-opts{display:grid;gap:5px}
.rc-opt{padding:7px 9px;border-radius:10px;background:var(--sunk);border:1px solid var(--line);font-size:.8rem;display:flex;align-items:center;gap:7px}
.rc-opt.correct{background:var(--oksoft);border-color:transparent;color:var(--ok);font-weight:700}
.rc-opt.wrong{background:var(--errsoft);border-color:transparent;color:var(--err);font-weight:700;text-decoration:line-through}
.rc-explain{margin-top:8px;padding:9px;background:rgba(245,158,11,.08);border-left:4px solid var(--accent);border-radius:8px;font-size:.8rem;color:var(--text2)}
.weak-q-item{background:var(--card);border:1px solid var(--line);border-left:5px solid var(--warn);border-radius:18px;padding:15px;margin-bottom:10px;animation:fadeInUp .4s ease}
.weak-q-item .wq-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px}
.weak-q-item .wq-q{font-weight:800;font-size:.95rem;line-height:1.45;flex:1}
.weak-count{background:var(--accent);color:#fff;padding:4px 11px;border-radius:20px;font-weight:800;font-size:.7rem;white-space:nowrap}
.weak-q-item .wq-opts{display:grid;gap:5px;margin:10px 0}
.weak-q-item .wq-opt{padding:7px 9px;border-radius:10px;background:var(--sunk);border:1px solid var(--line);font-size:.8rem}
.weak-q-item .wq-opt.correct{background:var(--oksoft);color:var(--ok);font-weight:700;border-color:transparent}
.weak-q-item .wq-meta{font-size:.68rem;color:var(--muted);margin-top:8px}
.pagination{display:flex;gap:5px;justify-content:center;margin:20px 0;flex-wrap:wrap}
.page-btn{padding:8px 14px;background:var(--card);border:1px solid var(--line);border-radius:9px;font-weight:700;font-size:.85rem;color:var(--text2)}
.page-btn:hover{border-color:var(--brand);color:var(--brand)}.page-btn.active{background:var(--brand);color:#fff;border-color:var(--brand)}
.analytics-chart{display:flex;flex-direction:column;gap:16px;margin-top:20px}
.bar-row{display:flex;align-items:center;gap:12px}
.bar-label{width:88px;font-weight:800;font-size:.84rem;flex-shrink:0}
.bar-track{flex:1;height:26px;background:var(--sunk);border-radius:50px;overflow:hidden}
.bar-fill{height:100%;background:linear-gradient(90deg,var(--brand),var(--brand2));border-radius:50px;display:flex;align-items:center;justify-content:flex-end;padding-right:9px;color:#fff;font-size:.7rem;font-weight:800;transition:width .9s ease;width:0}
.tabs{display:flex;gap:4px;padding:4px;background:var(--sunk);border-radius:13px;margin-bottom:16px;overflow-x:auto}
.tab{padding:10px 16px;border-radius:9px;font-weight:700;font-size:.85rem;color:var(--text2);white-space:nowrap}
.tab.active{background:var(--card);color:var(--brand);box-shadow:var(--shadow)}
.tab-panel{display:none}.tab-panel.active{display:block;animation:fadeInUp .3s ease}
.form-card{display:grid;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:20px;box-shadow:var(--shadow)}
.form-card label{font-weight:700;color:var(--text2);font-size:.84rem;display:block;margin-bottom:4px}
.form-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.form-actions.between{justify-content:space-between}
.check-row{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--sunk);border-radius:11px}
.check-row input{width:auto}.check-row label{margin:0;cursor:pointer}
.export-card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:22px;box-shadow:var(--shadow)}
.export-card h3{font-size:1.1rem;margin-bottom:6px}.export-card p{color:var(--text2);font-size:.85rem;margin-bottom:16px}
.list-toolbar{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.list-toolbar input,.list-toolbar select{flex:1;min-width:140px}
.questions-list{display:grid;gap:8px}
.q-row{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:13px;background:var(--card);border:1px solid var(--line);border-radius:15px;box-shadow:var(--shadow)}
.q-row .q-cat{display:inline-block;padding:2px 9px;border-radius:20px;font-size:.62rem;font-weight:800;background:rgba(79,70,229,.1);color:var(--brand);margin-bottom:6px}
.q-row .q-text{font-weight:700;font-size:.88rem}.q-row .q-ans{font-size:.72rem;color:var(--ok);font-weight:700}
.q-row .del{padding:4px 9px;border-radius:7px;font-weight:800;font-size:.68rem;border:1px solid var(--line);color:var(--err)}
.q-row .del:hover{background:var(--err);color:#fff}
.modal{display:none;position:fixed;inset:0;background:rgba(10,12,30,.55);justify-content:center;align-items:center;z-index:5000;padding:16px;backdrop-filter:blur(4px)}
.modal.active{display:flex}
.modal-content{background:var(--card);padding:26px;border-radius:20px;max-width:430px;width:100%;box-shadow:var(--shadowLg);animation:popIn .3s ease}
.modal-header{font-size:1.2rem;font-weight:800;margin-bottom:8px}.modal-sub{color:var(--text2);font-size:.85rem;margin-bottom:16px}
.modal-footer{display:flex;gap:8px;margin-top:20px;justify-content:flex-end}
.loading-overlay{position:fixed;inset:0;background:rgba(10,12,30,.5);display:none;justify-content:center;align-items:center;z-index:9999;backdrop-filter:blur(4px)}
.loading-overlay.active{display:flex}
.loading-box{background:var(--card);padding:32px;border-radius:18px;text-align:center;animation:popIn .3s ease}
.spinner{border:4px solid var(--sunk);border-top:4px solid var(--brand);border-radius:50%;width:46px;height:46px;animation:spin 1s linear infinite;margin:0 auto 14px}
@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
.toast{position:fixed;left:50%;bottom:84px;transform:translate(-50%,150%);padding:12px 18px;border-radius:12px;background:var(--text);color:#fff;font-weight:700;font-size:.85rem;box-shadow:var(--shadowLg);z-index:100;pointer-events:none;opacity:0;transition:.3s;max-width:calc(100% - 32px)}
.toast.show{transform:translate(-50%,0);opacity:1}.toast.success{background:var(--ok)}.toast.error{background:var(--err)}
#confetti{position:fixed;inset:0;pointer-events:none;z-index:99}
kbd{font-family:var(--mono);font-size:.68rem;padding:2px 6px;border-radius:6px;border:1px solid var(--line);background:var(--sunk)}
@media(min-width:700px){.desktop-nav{display:flex!important}}
</style>
</head>
<body>
<div class="bg-blob blob-1"></div>
<div class="bg-blob blob-2"></div>

<svg width="0" height="0" style="position:absolute"><defs>
<linearGradient id="gradRing" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#6366f1"/><stop offset="55%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#ec4899"/>
</linearGradient></defs></svg>

<div class="loading-overlay" id="loadingOverlay"><div class="loading-box"><div class="spinner"></div><p style="font-weight:600;color:var(--text2)">Loading…</p></div></div>

<div class="modal" id="passwordModal">
  <div class="modal-content">
    <div class="modal-header">🔐 Export password</div>
    <p class="modal-sub">Download all questions as a JSON file.</p>
    <input type="password" id="exportPassword" placeholder="Password" autocomplete="off">
    <div class="modal-footer">
      <button class="btn-ghost" onclick="closePasswordModal()">Cancel</button>
      <button class="btn-primary" onclick="submitExportPassword()">Export</button>
    </div>
  </div>
</div>

<div class="modal" id="testConfigModal">
  <div class="modal-content">
    <div class="modal-header">⚙️ Test setup</div>
    <p class="modal-sub" id="configDesc">Customise your test.</p>
    <div class="form-card" style="padding:0;gap:14px">
      <div><label>Number of questions</label>
        <select id="configLimit">
          <option value="10">10 questions</option>
          <option value="20" selected>20 questions</option>
          <option value="30">30 questions</option>
          <option value="50">50 questions</option>
        </select>
      </div>
      <div><label>Mode</label>
        <select id="configMode">
          <option value="normal">Normal · all questions</option>
          <option value="weak">Weak Practice · missed once</option>
          <option value="hard">Hard Drill · missed twice</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost" onclick="closeTestConfig()">Cancel</button>
      <button class="btn-primary" onclick="startCustomTest()">Start test</button>
    </div>
  </div>
</div>

<header class="navbar"><div class="container nav-wrap">
  <a class="brand" href="#" onclick="nav('dashboard');return false;"><span class="brand-dot"></span>MockTest<span style="color:var(--accent)">.pro</span></a>
  <div class="nav-right">
    <span class="user-chip" id="userChip" hidden onclick="nav('analytics')"><span class="dot-live"></span><span id="userName"></span></span>
    <button id="themeToggle" class="icon-btn" title="Toggle theme">
      <svg class="i-sun" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
      <svg class="i-moon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </button>
  </div>
</div></header>

<section id="welcomeScreen" class="screen active"><div class="container hero">
  <div class="hero-tag"><span class="dot-live"></span> Level 99 Edition · No signup needed</div>
  <h1 class="hero-title">Practice <span class="grad-word">smart</span>,<br>score <span class="grad-word">higher</span>.</h1>
  <p class="hero-sub">Enter your name, pick a subject, and take timed mock tests. Earn XP, keep your streak, and reach Level 99.</p>
  <div class="name-card">
    <label for="nameInput">Your name</label>
    <div class="name-row">
      <input id="nameInput" type="text" placeholder="e.g. Rahul Sharma" autocomplete="off">
      <button id="startBtn" class="btn-primary">Enter ➜</button>
    </div>
    <p class="name-hint">Your name is stored only in this browser — no account needed.</p>
  </div>
</div></section>

<section id="dashboardScreen" class="screen"><div class="container">
  <div class="profile-card">
    <div class="pc-left">
      <h2>Hi, <span id="helloName" class="grad-word">Friend</span> 👋</h2>
      <p id="streakText" style="color:rgba(255,255,255,.9)">🔥 Daily streak: 0 days</p>
      <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
        <span class="chip">⭐ Level <span id="dashLevel">1</span></span>
        <span class="chip">💯 <span id="dashAvg">0</span>% avg</span>
      </div>
    </div>
    <div class="pc-right"><div class="level-badge" id="dashLevelBig">1</div><span>Level</span></div>
  </div>
  <div class="quick-stats" id="quickStats"></div>
  <div class="page-head"><div><p class="eyebrow">Actions</p><h2 class="page-title">What next?</h2></div></div>
  <div class="grid-2" id="actionGrid"></div>
  <div class="section-h">🕒 Recent attempts</div>
  <div id="recentList" class="recent-list"></div>
</div></section>

<section id="categoriesScreen" class="screen"><div class="container">
  <div class="page-head"><div><p class="eyebrow">Categories</p><h2 class="page-title">Pick a subject 🎯</h2></div><button class="btn-ghost" onclick="nav('dashboard')">← Home</button></div>
  <div class="grid-2" id="categoryGrid"></div>
</div></section>

<section id="topicsScreen" class="screen"><div class="container">
  <div class="page-head">
    <div><p class="eyebrow" id="topicCatName"></p><h2 class="page-title">Topics</h2></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-ghost" onclick="nav('categories')">← Back</button>
      <button class="btn-primary" id="allTopicBtn">Full category test</button>
    </div>
  </div>
  <div id="topicList" class="subtopic-grid"></div>
</div></section>

<section id="testScreen" class="screen">
  <div class="test-topbar"><div class="container test-topwrap">
    <div class="tp-progress"><span id="tpNow">1</span>/<span id="tpTotal">10</span><div class="tp-bar"><span id="tpBar"></span></div></div>
    <div class="tp-timer" id="tpTimer">⏱ 10:00</div>
    <button id="quitTestBtn" class="btn-ghost" style="padding:7px 12px;font-size:.8rem">Quit</button>
  </div></div>
  <div class="container test-body">
    <div class="palette" id="qPalette"></div>
    <div id="questionCard" class="question-card"></div>
    <div class="test-actions">
      <button id="prevBtn" class="btn-ghost" disabled>← Previous</button>
      <div style="display:flex;gap:8px">
        <button id="nextBtn" class="btn-primary">Next →</button>
        <button id="finishBtn" class="btn-primary hidden">Finish ✓</button>
      </div>
    </div>
    <p style="text-align:center;font-size:.7rem;color:var(--muted);margin-top:16px">
      <kbd>1–4</kbd> answer · <kbd>Enter</kbd> next · <kbd>←</kbd> back
    </p>
  </div>
</section>

<section id="resultScreen" class="screen"><div class="container">
  <div class="result-hero">
    <div class="result-emoji" id="resultEmoji">🎉</div>
    <h2>Test complete!</h2>
    <p id="resultSubtitle" style="color:var(--text2)">Great effort!</p>
    <div class="ring-wrap"><svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"></circle><circle cx="60" cy="60" r="52" class="ring-fg" id="ringFg"></circle></svg><div class="ring-center"><b id="resultPct">0%</b><span>Score</span></div></div>
    <div class="result-grid">
      <div><b id="rCorrect">0</b><span>Correct</span></div>
      <div><b id="rWrong">0</b><span>Wrong</span></div>
      <div><b id="rSkip">0</b><span>Skipped</span></div>
      <div><b id="rTime">00:00</b><span>Time</span></div>
    </div>
    <div class="xp-banner" id="xpBanner" hidden></div>
    <div class="result-actions">
      <button id="reviewBtn" class="btn-ghost">📖 Review answers</button>
      <button id="retakeBtn" class="btn-primary">🔄 Retake</button>
      <button class="btn-ghost" onclick="nav('dashboard')">🏠 Home</button>
    </div>
  </div>
  <div id="reviewList" class="review-list hidden"></div>
</div></section>

<section id="weaklistScreen" class="screen"><div class="container">
  <div class="page-head">
    <div><p class="eyebrow">Weak questions</p><h2 class="page-title">Weak spots 📚</h2></div>
    <div style="display:flex;gap:8px">
      <button class="btn-primary" onclick="openTestConfig('weak')">🔥 Practice weak</button>
      <button class="btn-ghost" onclick="nav('dashboard')">← Home</button>
    </div>
  </div>
  <div id="weakListContainer"></div>
  <div class="pagination" id="weakPagination"></div>
</div></section>

<section id="analyticsScreen" class="screen"><div class="container">
  <div class="page-head"><div><p class="eyebrow">Performance</p><h2 class="page-title">Analytics 📊</h2></div><button class="btn-ghost" onclick="nav('dashboard')">← Home</button></div>
  <div class="form-card" id="xpCard" style="background:linear-gradient(135deg,var(--brand),#7c3aed);color:#fff;border:none">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <h3 style="margin-bottom:4px">Total XP</h3>
        <p style="color:rgba(255,255,255,.85);font-size:.85rem" id="analyticsXpText">0 XP</p>
      </div>
      <div class="level-badge" id="analyticsLevel" style="width:54px;height:54px;font-size:1.2rem">1</div>
    </div>
    <div style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;font-size:.74rem;color:rgba(255,255,255,.85);margin-bottom:4px">
        <span>Progress to Level <span id="nextLevel">2</span></span><span id="xpProgressText">0/100</span>
      </div>
      <div class="tp-bar" style="max-width:none;height:8px;background:rgba(255,255,255,.25)"><span id="xpProgressBar" style="background:#fbbf24;width:0%"></span></div>
    </div>
  </div>
  <div class="section-h">Category-wise accuracy</div>
  <div class="analytics-chart" id="analyticsChart"></div>
</div></section>

<section id="manageScreen" class="screen"><div class="container">
  <div class="page-head"><div><p class="eyebrow">Question bank</p><h2 class="page-title">Manage 📦</h2></div><button class="btn-ghost" onclick="nav('dashboard')">← Home</button></div>
  <div class="tabs">
    <button class="tab active" data-tab="bulk">📋 Bulk import</button>
    <button class="tab" data-tab="export">📥 Export</button>
    <button class="tab" data-tab="list">📜 All (<span id="qCount">0</span>)</button>
    <button class="tab" data-tab="github">☁️ GitHub</button>
  </div>
  <div class="tab-panel active" id="tab-bulk">
    <div class="form-card">
      <div><label>Category</label>
        <select id="bulkCategory"><option>GK</option><option>Maths</option><option>English</option><option>Reasoning</option><option>Science</option></select>
      </div>
      <div class="check-row"><input type="checkbox" id="autoSplit" checked><label for="autoSplit">Auto-split into tests of 20 questions</label></div>
      <div><label>JSON text</label>
        <textarea id="bulkText" rows="9" placeholder='[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]'></textarea>
      </div>
      <div class="form-actions between">
        <button id="sampleBtn" class="btn-ghost">📄 Load sample</button>
        <button id="importBtn" class="btn-primary">Import questions</button>
      </div>
    </div>
  </div>
  <div class="tab-panel" id="tab-export">
    <div class="export-card">
      <h3>📥 Export all questions</h3>
      <p>Download the whole bank as a JSON file for backup or moving to another machine.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-primary" onclick="showPasswordModal()">📥 Export JSON</button>
        <span style="align-self:center;color:var(--muted);font-size:.78rem">🔒 Password: <kbd>121520</kbd></span>
      </div>
    </div>
  </div>
  <div class="tab-panel" id="tab-list">
    <div class="list-toolbar">
      <input id="searchQ" type="search" placeholder="🔎 Search…">
      <select id="filterCat"><option value="">All categories</option><option>GK</option><option>Maths</option><option>English</option><option>Reasoning</option><option>Science</option></select>
      <button id="clearAllBtn" class="btn-danger">Clear all</button>
    </div>
    <div id="questionsList" class="questions-list"></div>
  </div>
  <div class="tab-panel" id="tab-github">
    <div class="export-card">
      <h3>☁️ GitHub backup</h3>
      <p>Push the question bank and all user progress to your GitHub repo, or restore it after a fresh start. Requires the GITHUB_TOKEN and GITHUB_REPO environment variables.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-primary" onclick="githubSync('backup')">☁️ Push backup</button>
        <button class="btn-ghost" onclick="githubSync('restore')">⬇️ Restore from GitHub</button>
      </div>
    </div>
  </div>
</div></section>

<nav class="bottom-nav" id="bottomNav">
  <button data-nav="dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><span>Home</span></button>
  <button data-nav="categories"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg><span>Test</span></button>
  <button data-nav="weaklist"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>Weak</span></button>
  <button data-nav="analytics"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg><span>Stats</span></button>
  <button data-nav="manage"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Manage</span></button>
</nav>

<div id="toast" class="toast"></div>
<canvas id="confetti"></canvas>

<script>
const state = {
  username: localStorage.getItem('mtp_user') || '',
  currentCategory: '',
  currentTest: null,
  timerInt: null,
  weakPage: 1,
  pendingConfig: null,
};
let audioCtx = null;

function playSound(type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'correct') {
      osc.type = 'sine'; osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'wrong') {
      osc.type = 'square'; osc.frequency.value = 220;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'levelup') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523, audioCtx.currentTime);
      osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    }
  } catch (e) {}
}
function vibrate(ms) { if (navigator.vibrate) navigator.vibrate(ms); }

function nav(screen) {
  history.pushState({}, '', '#' + screen);
  renderScreen(screen);
}
window.addEventListener('popstate', () => {
  renderScreen(window.location.hash.replace('#', '') || 'dashboard');
});

function renderScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const map = { welcome:'welcomeScreen', dashboard:'dashboardScreen', categories:'categoriesScreen', topics:'topicsScreen', test:'testScreen', result:'resultScreen', manage:'manageScreen', weaklist:'weaklistScreen', analytics:'analyticsScreen' };
  const el = document.getElementById(map[id]);
  if (el) el.classList.add('active');
  if (id === 'dashboard') renderDashboard();
  if (id === 'categories') renderCategories();
  if (id === 'manage') renderManage();
  if (id === 'weaklist') loadWeakList(1);
  if (id === 'analytics') renderAnalytics();
  document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.nav === id));
  window.scrollTo(0, 0);
}
document.querySelectorAll('.bottom-nav button').forEach(b => b.addEventListener('click', () => nav(b.dataset.nav)));

let toastTimer;
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.className = 'toast show ' + type;
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('mtp_theme', t);
}
document.getElementById('themeToggle').addEventListener('click', () =>
  applyTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'));
applyTheme(localStorage.getItem('mtp_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

function showLoading(show) { document.getElementById('loadingOverlay').classList.toggle('active', show); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// ---------- welcome ----------
document.addEventListener('DOMContentLoaded', () => {
  const enter = () => {
    const val = document.getElementById('nameInput').value.trim();
    if (!val) { toast('Please enter your name', 'error'); return; }
    state.username = val;
    localStorage.setItem('mtp_user', val);
    document.getElementById('userChip').hidden = false;
    document.getElementById('userName').textContent = val;
    nav('dashboard');
  };
  document.getElementById('startBtn').addEventListener('click', enter);
  document.getElementById('nameInput').addEventListener('keypress', e => { if (e.key === 'Enter') enter(); });
  if (state.username) {
    document.getElementById('userChip').hidden = false;
    document.getElementById('userName').textContent = state.username;
    renderScreen(window.location.hash.replace('#', '') || 'dashboard');
  }
});

// ---------- dashboard ----------
async function renderDashboard() {
  document.getElementById('helloName').textContent = state.username;
  try {
    const stats = await (await fetch(`/api/stats?username=${encodeURIComponent(state.username)}`)).json();
    document.getElementById('dashLevel').textContent = stats.level;
    document.getElementById('dashLevelBig').textContent = stats.level;
    document.getElementById('dashAvg').textContent = stats.avg_pct;
    document.getElementById('streakText').textContent = `🔥 Daily streak: ${stats.streak} day${stats.streak === 1 ? '' : 's'}`;
    document.getElementById('quickStats').innerHTML = `
      <div class="stat"><b>${stats.total_questions}</b><span>Questions</span></div>
      <div class="stat"><b>${stats.total_tests}</b><span>Tests</span></div>
      <div class="stat"><b>${stats.avg_pct}%</b><span>Average</span></div>
      <div class="stat"><b>${stats.weak_count}</b><span>Weak</span></div>`;
  } catch (e) {}

  document.getElementById('actionGrid').innerHTML = `
    <button class="action-card" onclick="nav('categories')"><div class="ac-icon g1">🎯</div><h3>Start a test</h3><p>Pick a subject & topic.</p><span class="ac-arrow">→</span></button>
    <button class="action-card" onclick="openTestConfig('weak')"><div class="ac-icon g4">🔥</div><h3>Weak practice</h3><p>Questions you missed.</p><span class="ac-arrow">→</span></button>
    <button class="action-card" onclick="openTestConfig('hard')"><div class="ac-icon g5">💪</div><h3>Hard drill</h3><p>Missed twice or more.</p><span class="ac-arrow">→</span></button>
    <button class="action-card" onclick="nav('weaklist')"><div class="ac-icon g3">📚</div><h3>Weak bank</h3><p>Review all misses.</p><span class="ac-arrow">→</span></button>
    <button class="action-card" onclick="nav('analytics')"><div class="ac-icon g6">📊</div><h3>Analytics</h3><p>Track your progress.</p><span class="ac-arrow">→</span></button>
    <button class="action-card" onclick="nav('manage')"><div class="ac-icon g2">➕</div><h3>Add questions</h3><p>Bulk JSON import.</p><span class="ac-arrow">→</span></button>`;

  const rl = document.getElementById('recentList');
  rl.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
  try {
    const res = await (await fetch(`/api/results?username=${encodeURIComponent(state.username)}`)).json();
    if (!res.length) {
      rl.innerHTML = '<div class="empty">No tests yet — take your first one!</div>';
      return;
    }
    rl.innerHTML = res.slice(0, 6).map(r => `
      <div class="recent-item">
        <div class="ri-left">
          <div class="ri-badge ${r.pct >= 70 ? 'ok' : r.pct >= 40 ? 'avg' : 'bad'}">${Math.round(r.pct)}%</div>
          <div><h5>${esc(r.category)}${r.topic ? ' · ' + esc(r.topic) : ''}</h5>
          <small>${new Date(r.ts).toLocaleString()} · ${fmtClock(r.time_sec)} · ${esc(r.mode)}</small></div>
        </div>
        <div><b>${r.correct}/${r.total}</b></div>
      </div>`).join('');
  } catch (e) { rl.innerHTML = '<div class="empty">Could not load results.</div>'; }
}

// ---------- categories / topics ----------
function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  const icons = ['🌍', '🔢', '🇬🇧', '🧩', '🔬'];
  const grads = ['g1', 'g2', 'g3', 'g4', 'g5'];
  grid.innerHTML = '<div class="skeleton-card"></div>'.repeat(4);
  fetch('/api/categories').then(r => r.json()).then(cats => {
    grid.innerHTML = cats.map((c, i) => `
      <button class="action-card" onclick="openCategory('${esc(c.category)}')">
        <div class="ac-icon ${grads[i % 5]}">${icons[i % 5]}</div>
        <h3>${esc(c.category)}</h3><p>${c.count} questions</p><span class="ac-arrow">→</span>
      </button>`).join('');
  }).catch(() => { grid.innerHTML = '<div class="empty">Failed to load categories.</div>'; });
}

function openCategory(cat) {
  state.currentCategory = cat;
  nav('topics');
  document.getElementById('topicCatName').textContent = cat;
  const list = document.getElementById('topicList');
  list.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
  fetch(`/api/topics?category=${encodeURIComponent(cat)}`).then(r => r.json()).then(topics => {
    if (!topics.length) { list.innerHTML = '<div class="empty">No topics in this category yet.</div>'; return; }
    list.innerHTML = topics.map(t => `
      <button class="subtopic-tile" onclick="openTestConfig('normal','${esc(cat)}','${esc(t.topic)}')">
        <h4>${esc(t.topic)}</h4><span>${t.count} questions · ${Math.max(1, Math.ceil(t.count / 2))} min</span>
      </button>`).join('');
  }).catch(() => { list.innerHTML = '<div class="empty">Failed to load topics.</div>'; });
  document.getElementById('allTopicBtn').onclick = () => openTestConfig('all', cat);
}

// ---------- test config ----------
function openTestConfig(mode, cat = null, topic = null) {
  state.pendingConfig = { mode, cat, topic };
  const desc = {
    normal: `Timed test from “${topic}” with instant answers & explanations.`,
    all: `Every question in ${cat}, shuffled — the full exam experience.`,
    weak: 'Questions you missed before. Retrain those weak spots now.',
    hard: 'Only questions missed at least twice. Get them right to clear them.',
  }[mode];
  document.getElementById('configDesc').textContent = desc;
  const ms = document.getElementById('configMode');
  ms.value = (mode === 'normal' || mode === 'all') ? 'normal' : mode;
  ms.disabled = !(mode === 'weak' || mode === 'hard');
  document.getElementById('testConfigModal').classList.add('active');
}
function closeTestConfig() { document.getElementById('testConfigModal').classList.remove('active'); state.pendingConfig = null; }
function startCustomTest() {
  const cfg = state.pendingConfig;
  const limit = parseInt(document.getElementById('configLimit').value);
  const mode = document.getElementById('configMode').value;
  closeTestConfig();
  startTest(cfg.cat, cfg.topic, mode, limit);
}

async function startTest(cat, topic, mode, limit = 20) {
  showLoading(true);
  try {
    const res = await fetch('/api/start-test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: state.username, category: cat, topic, mode, limit }),
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Error', 'error'); return; }
    state.currentTest = {
      questions: data.questions,
      answers: new Array(data.questions.length).fill(null),
      currentIdx: 0,
      startAt: Date.now(),
      timerSec: data.timer_sec,
      mode: data.mode,
      category: cat || data.questions[0].category,
      topic: topic || '',
    };
    nav('test');
    renderTestQuestion();
    startTimer();
  } catch (e) { toast('Something went wrong', 'error'); } finally { showLoading(false); }
}

function startTimer() {
  clearInterval(state.timerInt);
  state.timerInt = setInterval(() => {
    const t = state.currentTest;
    if (!t) return;
    const left = Math.max(0, t.timerSec - Math.floor((Date.now() - t.startAt) / 1000));
    const timerEl = document.getElementById('tpTimer');
    timerEl.textContent = `⏱ ${fmtClock(left)}`;
    timerEl.classList.toggle('warn', left <= 30 && left > 0);
    if (left <= 0) { clearInterval(state.timerInt); submitTest(true); }
  }, 250);
}
function fmtClock(s) {
  s = Math.max(0, Math.floor(s));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function renderTestQuestion() {
  const t = state.currentTest;
  if (!t) return;
  const q = t.questions[t.currentIdx];
  const answered = t.answers[t.currentIdx];
  document.getElementById('tpNow').textContent = t.currentIdx + 1;
  document.getElementById('tpTotal').textContent = t.questions.length;
  document.getElementById('tpBar').style.width = ((t.currentIdx + 1) / t.questions.length * 100) + '%';

  document.getElementById('qPalette').innerHTML = t.questions.map((_, i) =>
    `<button class="${i === t.currentIdx ? 'cur' : t.answers[i] !== null ? 'done' : ''}" onclick="jumpTo(${i})">${i + 1}</button>`).join('');

  const card = document.getElementById('questionCard');
  card.innerHTML = `
    <span class="q-cat-top">${esc(q.category)}${q.topic ? ' · ' + esc(q.topic) : ''}</span>
    <h3 class="q-text-lg">${esc(q.question)}</h3>
    <div class="opt-list">
      ${q.options.map((op, i) => {
        let cls = '';
        if (answered !== null) {
          if (i === q.correct) cls = 'correct';
          else if (i === answered) cls = 'wrong';
        }
        return `<button class="opt ${cls}" data-i="${i}" ${answered !== null ? 'disabled' : ''}>
          <span class="kbd">${answered !== null && i === q.correct ? '✓' : answered !== null && i === answered ? '✗' : String.fromCharCode(65 + i)}</span>
          <span>${esc(op)}</span></button>`;
      }).join('')}
    </div>
    ${answered !== null && q.explanation ? `<div class="explanation"><b>💡 Explanation:</b> ${esc(q.explanation)}</div>` : ''}`;
  card.classList.remove('q-card-animate');
  void card.offsetWidth;
  card.classList.add('q-card-animate');

  card.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
    const t2 = state.currentTest;
    if (t2.answers[t2.currentIdx] !== null) return;
    const chosen = parseInt(b.dataset.i);
    t2.answers[t2.currentIdx] = chosen;
    if (chosen === q.correct) { playSound('correct'); vibrate(40); }
    else { playSound('wrong'); vibrate([50, 50, 50]); }
    renderTestQuestion();
  }));

  document.getElementById('prevBtn').disabled = t.currentIdx === 0;
  const last = t.currentIdx === t.questions.length - 1;
  document.getElementById('nextBtn').classList.toggle('hidden', last);
  document.getElementById('finishBtn').classList.toggle('hidden', !last);
}
function jumpTo(i) { state.currentTest.currentIdx = i; renderTestQuestion(); }

document.addEventListener('keydown', (e) => {
  const t = state.currentTest;
  if (!t || !document.getElementById('testScreen').classList.contains('active')) return;
  if (document.getElementById('testConfigModal').classList.contains('active')) return;
  if (t.answers[t.currentIdx] === null && ['1', '2', '3', '4'].includes(e.key)) {
    e.preventDefault();
    const idx = parseInt(e.key) - 1;
    const btn = document.querySelector(`.opt[data-i="${idx}"]`);
    if (btn && !btn.disabled) btn.click();
  } else if (e.key === 'Enter' || e.key.toLowerCase() === 'n') {
    e.preventDefault();
    if (!document.getElementById('nextBtn').classList.contains('hidden')) document.getElementById('nextBtn').click();
    else if (!document.getElementById('finishBtn').classList.contains('hidden')) document.getElementById('finishBtn').click();
  } else if (e.key === 'Backspace' || e.key.toLowerCase() === 'p' || e.key === 'ArrowLeft') {
    e.preventDefault();
    if (!document.getElementById('prevBtn').disabled) document.getElementById('prevBtn').click();
  }
});

document.getElementById('prevBtn').addEventListener('click', () => {
  if (state.currentTest.currentIdx > 0) { state.currentTest.currentIdx--; renderTestQuestion(); }
});
document.getElementById('nextBtn').addEventListener('click', () => {
  if (state.currentTest.currentIdx < state.currentTest.questions.length - 1) { state.currentTest.currentIdx++; renderTestQuestion(); }
});
document.getElementById('finishBtn').addEventListener('click', () => submitTest(false));
document.getElementById('quitTestBtn').addEventListener('click', () => {
  if (confirm('Quit this test? Progress will not be saved.')) {
    clearInterval(state.timerInt);
    state.currentTest = null;
    nav('dashboard');
  }
});

// ---------- submit + result ----------
let submitting = false;
async function submitTest(timeUp) {
  if (submitting) return;
  submitting = true;
  clearInterval(state.timerInt);
  const t = state.currentTest;
  const answers = t.questions.map((q, i) => ({
    question_id: q.question_id,
    selected: t.answers[i] === null ? null : q.shuffle[t.answers[i]],
  }));
  const timeSec = Math.floor((Date.now() - t.startAt) / 1000);
  showLoading(true);
  try {
    const res = await fetch('/api/submit-test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: state.username, answers, time_sec: timeSec, category: t.category, topic: t.topic, mode: t.mode }),
    });
    const d = await res.json();
    document.getElementById('rCorrect').textContent = d.correct;
    document.getElementById('rWrong').textContent = d.wrong;
    document.getElementById('rSkip').textContent = d.skipped;
    document.getElementById('rTime').textContent = fmtClock(timeSec);
    document.getElementById('resultPct').textContent = d.pct + '%';
    document.getElementById('resultEmoji').textContent = d.pct >= 90 ? '🏆' : d.pct >= 70 ? '🎉' : d.pct >= 50 ? '👍' : '📚';
    document.getElementById('resultSubtitle').textContent =
      (d.pct >= 90 ? 'Outstanding — you crushed it!' : d.pct >= 70 ? 'Great job — keep it up!' : d.pct >= 50 ? 'Solid effort — keep practicing!' : 'Review and try again!') +
      (timeUp ? ' · Time is up' : '');

    const circ = 2 * Math.PI * 52;
    const ring = document.getElementById('ringFg');
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ;
    nav('result');
    setTimeout(() => { ring.style.strokeDashoffset = circ - (circ * d.pct / 100); }, 120);

    const xpB = document.getElementById('xpBanner');
    xpB.hidden = false;
    xpB.innerHTML = d.is_level_up
      ? `<span>⚡ <b>+${d.xp_earned} XP</b> · Level ${d.new_level} reached!</span><span style="background:#fbbf24;color:#1c2135;padding:4px 12px;border-radius:50px;font-weight:800;font-size:.75rem">⬆ LEVEL UP</span>`
      : `<span>⚡ <b>+${d.xp_earned} XP</b> · ${d.new_xp} XP total</span><span style="background:rgba(255,255,255,.18);padding:4px 12px;border-radius:50px;font-size:.75rem;font-weight:700">🔥 ${d.new_streak}-day streak</span>`;

    if (d.pct >= 70) { fireConfetti(); playSound('levelup'); vibrate(100); }
    if (d.xp_earned > 0) {
      const popup = document.createElement('div');
      popup.className = 'xp-popup';
      popup.textContent = `+${d.xp_earned} XP`;
      document.body.appendChild(popup);
      setTimeout(() => popup.remove(), 2500);
    }

    const rl = document.getElementById('reviewList');
    rl.classList.add('hidden');
    rl.innerHTML = t.questions.map((q, i) => {
      const ans = t.answers[i];
      const status = ans === null ? 'sk' : ans === q.correct ? 'ok' : 'no';
      const label = status === 'ok' ? 'Correct' : status === 'no' ? 'Wrong' : 'Skipped';
      return `<div class="review-card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="q-cat-top" style="font-size:.66rem">Q${i + 1} · ${esc(q.category)}</span>
          <span class="rc-status ${status}">${label}</span>
        </div>
        <p class="rc-q">${esc(q.question)}</p>
        <div class="rc-opts">${q.options.map((op, j) => {
          let cls = '';
          if (j === q.correct) cls = 'correct';
          else if (j === ans) cls = 'wrong';
          return `<div class="rc-opt ${cls}"><b style="width:20px">${String.fromCharCode(65 + j)}.</b> ${esc(op)}</div>`;
        }).join('')}</div>
        ${q.explanation ? `<div class="rc-explain"><b>💡 Explanation:</b> ${esc(q.explanation)}</div>` : ''}
      </div>`;
    }).join('');
  } catch (e) { toast('Could not submit the test', 'error'); } finally { showLoading(false); submitting = false; }
}
document.getElementById('reviewBtn').addEventListener('click', () => {
  const rl = document.getElementById('reviewList');
  rl.classList.toggle('hidden');
  if (!rl.classList.contains('hidden')) rl.scrollIntoView({ behavior: 'smooth' });
});
document.getElementById('retakeBtn').addEventListener('click', () => {
  const t = state.currentTest;
  if (!t) return;
  if (t.mode === 'weak' || t.mode === 'hard') openTestConfig(t.mode);
  else if (t.mode === 'normal' && t.topic) openTestConfig('normal', t.category, t.topic);
  else openTestConfig('all', t.category);
});

// ---------- weak questions ----------
async function loadWeakList(page) {
  state.weakPage = page;
  const container = document.getElementById('weakListContainer');
  const pagination = document.getElementById('weakPagination');
  container.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div>';
  pagination.innerHTML = '';
  try {
    const data = await (await fetch(`/api/weak-questions/${encodeURIComponent(state.username)}?page=${page}`)).json();
    if (!data.weak_questions.length) {
      container.innerHTML = '<div class="empty">🎉 No weak questions — amazing!</div>';
      return;
    }
    container.innerHTML = data.weak_questions.map(w => `
      <div class="weak-q-item">
        <div class="wq-head"><div class="wq-q">${esc(w.question)}</div><span class="weak-count">❌ ${w.wrong_count}x</span></div>
        <div><span class="q-cat-top" style="font-size:.66rem">${esc(w.category)}${w.topic ? ' · ' + esc(w.topic) : ''}</span></div>
        <div class="wq-opts">${w.options.map((opt, i) =>
          `<div class="wq-opt ${i === w.correct ? 'correct' : ''}"><b>${String.fromCharCode(65 + i)}.</b> ${esc(opt)}</div>`).join('')}</div>
        ${w.explanation ? `<div class="rc-explain"><b>💡 Explanation:</b> ${esc(w.explanation)}</div>` : ''}
        <div class="wq-meta">Last missed: ${new Date(w.last_wrong).toLocaleString()}</div>
      </div>`).join('');
    let phtml = '';
    for (let i = 1; i <= data.total_pages; i++) {
      phtml += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadWeakList(${i})">${i}</button>`;
    }
    pagination.innerHTML = phtml;
  } catch (e) { container.innerHTML = '<div class="empty">Failed to load.</div>'; }
}

// ---------- analytics ----------
async function renderAnalytics() {
  try {
    const stats = await (await fetch(`/api/stats?username=${encodeURIComponent(state.username)}`)).json();
    document.getElementById('analyticsLevel').textContent = stats.level;
    document.getElementById('analyticsXpText').textContent = `${stats.xp} XP · 🔥 ${stats.streak}-day streak`;
    document.getElementById('nextLevel').textContent = stats.level + 1;
    document.getElementById('xpProgressText').textContent = `${stats.xp_into_level}/100`;
    document.getElementById('xpProgressBar').style.width = `${stats.xp_into_level}%`;
  } catch (e) {}
  const chart = document.getElementById('analyticsChart');
  chart.innerHTML = '<div class="skeleton-card"></div>';
  try {
    const res = await (await fetch(`/api/analytics?username=${encodeURIComponent(state.username)}`)).json();
    if (!res.length) { chart.innerHTML = '<div class="empty">No data yet — finish a few tests first.</div>'; return; }
    chart.innerHTML = res.map(c => `
      <div class="bar-row">
        <div class="bar-label">${esc(c.category)}</div>
        <div class="bar-track"><div class="bar-fill" data-t="${c.accuracy}">${c.accuracy}%</div></div>
      </div>`).join('');
    setTimeout(() => document.querySelectorAll('.bar-fill').forEach(b => { b.style.width = b.dataset.t + '%'; }), 120);
  } catch (e) { chart.innerHTML = '<div class="empty">Failed to load analytics.</div>'; }
}

// ---------- manage ----------
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(x => x.classList.remove('active'));
  const panel = document.getElementById('tab-' + name);
  if (panel) panel.classList.add('active');
  if (name === 'list') renderManage();
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

document.getElementById('importBtn').addEventListener('click', async () => {
  const category = document.getElementById('bulkCategory').value;
  const autoSplit = document.getElementById('autoSplit').checked;
  const raw = document.getElementById('bulkText').value.trim();
  if (!raw) { toast('Paste some JSON first', 'error'); return; }
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error();
    const res = await fetch('/api/import-questions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, auto_split: autoSplit, questions: arr }),
    });
    const d = await res.json();
    if (!res.ok) { toast(d.error || 'Error', 'error'); return; }
    toast(`${d.added} questions imported ✓`, 'success');
    document.getElementById('bulkText').value = '';
  } catch (e) { toast('Invalid JSON format', 'error'); }
});
document.getElementById('sampleBtn').addEventListener('click', () => {
  document.getElementById('bulkText').value = JSON.stringify([
    { question: 'Sample Q1?', options: ['A', 'B', 'C', 'D'], correct: 0, explanation: 'Sample explanation.' },
    { question: 'Sample Q2?', options: ['A', 'B', 'C', 'D'], correct: 1, explanation: 'Another sample.' },
  ], null, 2);
});
document.getElementById('clearAllBtn').addEventListener('click', async () => {
  if (!confirm('Delete the ENTIRE question bank? This cannot be undone.')) return;
  await fetch('/api/clear-all', { method: 'DELETE' });
  renderManage();
  toast('All questions deleted', 'success');
});
document.getElementById('searchQ').addEventListener('input', renderManage);
document.getElementById('filterCat').addEventListener('change', renderManage);

async function renderManage() {
  try {
    const qs = await (await fetch('/api/questions')).json();
    document.getElementById('qCount').textContent = qs.length;
    const q = (document.getElementById('searchQ').value || '').toLowerCase();
    const fc = document.getElementById('filterCat').value;
    const filtered = qs.filter(x => (!fc || x.category === fc) && (!q || x.question.toLowerCase().includes(q)));
    document.getElementById('questionsList').innerHTML = filtered.length
      ? filtered.map(x => `<div class="q-row">
          <div style="flex:1"><span class="q-cat">${esc(x.category)} · ${esc(x.topic)}</span>
          <p class="q-text">${esc(x.question)}</p>
          <div class="q-ans">✓ ${String.fromCharCode(65 + x.correct)}. ${esc(x.options[x.correct])}</div></div>
          <button class="del" onclick="delQ(${x.id})">Delete</button>
        </div>`).join('')
      : '<div class="empty">No questions found.</div>';
  } catch (e) {}
}
async function delQ(id) {
  await fetch(`/api/questions/${id}`, { method: 'DELETE' });
  renderManage();
  toast('Question deleted', 'success');
}

function showPasswordModal() { document.getElementById('passwordModal').classList.add('active'); setTimeout(() => document.getElementById('exportPassword').focus(), 100); }
function closePasswordModal() { document.getElementById('passwordModal').classList.remove('active'); document.getElementById('exportPassword').value = ''; }
async function submitExportPassword() {
  const password = document.getElementById('exportPassword').value;
  if (!password) { toast('Enter the password', 'error'); return; }
  showLoading(true);
  try {
    const res = await fetch('/api/export-all', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { toast('Wrong password', 'error'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    toast('Export ready ✓', 'success');
    closePasswordModal();
  } catch (e) { toast('Export failed', 'error'); } finally { showLoading(false); }
}
document.getElementById('exportPassword').addEventListener('keypress', e => { if (e.key === 'Enter') submitExportPassword(); });
document.getElementById('passwordModal').addEventListener('click', e => { if (e.target.id === 'passwordModal') closePasswordModal(); });
document.getElementById('testConfigModal').addEventListener('click', e => { if (e.target.id === 'testConfigModal') closeTestConfig(); });

// ---------- github sync ----------
async function githubSync(action) {
  const password = prompt('Enter the sync password:');
  if (!password) return;
  showLoading(true);
  try {
    const res = await fetch('/api/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, password }),
    });
    const d = await res.json();
    if (!res.ok) { toast(d.error || 'Sync failed', 'error'); return; }
    if (action === 'backup') toast('Pushed to GitHub ✓', 'success');
    else toast('Restored from GitHub ✓', 'success');
  } catch (e) { toast('Sync failed', 'error'); } finally { showLoading(false); }
}

// ---------- confetti ----------
const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
function resizeC() { canvas.width = innerWidth; canvas.height = innerHeight; }
window.addEventListener('resize', resizeC);
resizeC();
function fireConfetti() {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  const pieces = [];
  for (let i = 0; i < 170; i++) {
    pieces.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * 240,
      y: innerHeight / 3,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -15 - 5,
      g: 0.35,
      s: Math.random() * 8 + 4,
      c: colors[Math.floor(Math.random() * colors.length)],
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
    });
  }
  let frames = 0;
  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    frames++;
    if (frames < 200) requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}
</script>
</body>
</html>"""


# Initialise the database on import so the app works under both
# `python app.py` and `gunicorn app:app` (how Render starts the app).
init_db()

# Restore user data from the GitHub backup when this is a fresh database
# (Render wipes /tmp on every restart; sync.py makes data survive it),
# then push a backup so the newest state is never lost.
if sync is not None and sync.configured():
    try:
        sync.restore_if_needed()
        sync.do_backup(force=False)
    except Exception as e:
        print('GitHub sync skipped:', e)


if __name__ == "__main__":
    print("=" * 52)
    print("  MockTest.pro — Level 99  (single-file edition)")
    print(f"  Database : {DB_PATH}")
    print(f"  Open     : http://127.0.0.1:{port}")
    print("  Stop     : Ctrl+C")
    print("=" * 52)
    port = int(os.getenv("PORT", 5000))
    app.run(
        host="0.0.0.0",
        port=port,
        debug=os.getenv("FLASK_DEBUG", "").lower() in ("1", "true", "yes"),
    )
