# lines.json -> voice.wav (48k mono) + tl.json  (word timings)
import ssl, sys, json, asyncio, subprocess, os, numpy as np
import edge_tts, edge_tts.communicate as c
if os.path.exists("/root/.ccr/ca-bundle.crt"):
    c._SSL_CTX = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
D = sys.argv[1]; SR = 48000
L = json.load(open(f"{D}/lines.json"))
async def gen(text, rate):
    co = edge_tts.Communicate(text, "es-ES-AlvaroNeural", rate=rate, boundary="WordBoundary")
    aud = b""; words = []
    async for ch in co.stream():
        if ch["type"] == "audio": aud += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append((ch["text"], ch["offset"]/1e7, (ch["offset"]+ch["duration"])/1e7))
    pcm = subprocess.run(["ffmpeg","-v","error","-i","pipe:0","-f","f32le","-ac","1","-ar",str(SR),"pipe:1"],
                         input=aud, capture_output=True).stdout
    return np.frombuffer(pcm, np.float32), words
out = []; tl = []; t = 0.25
async def main():
    global t
    for ln in L:
        a, w = await gen(ln["text"], ln.get("rate", "+24%"))
        t += ln.get("gap", 0.1)
        s0 = max(0, w[0][1]-0.04); s1 = min(len(a)/SR, w[-1][2]+0.12)
        seg = a[int(s0*SR):int(s1*SR)]
        start = t
        out.append((start, seg))
        tl.append({"id": ln["id"], "text": ln["text"], "s": round(start,3), "e": round(start+len(seg)/SR,3),
                   "w": [[x[0], round(start+x[1]-s0,3), round(start+x[2]-s0,3)] for x in w]})
        t = start + len(seg)/SR
asyncio.run(main())
tot = t + 2.6
buf = np.zeros(int(tot*SR), np.float32)
for s, seg in out: buf[int(s*SR):int(s*SR)+len(seg)] += seg
import scipy.io.wavfile as wf
wf.write(f"{D}/voice.wav", SR, buf)
json.dump({"dur": round(tot,3), "lines": tl}, open(f"{D}/tl.json","w"), ensure_ascii=False, indent=0)
for l in tl: print(f'{l["id"]:4} {l["s"]:6.2f}-{l["e"]:6.2f}  ' + " ".join(f'{i}:{w[0]}@{w[1]:.2f}' for i,w in enumerate(l["w"])))
print("TOTAL", round(tot,2))
